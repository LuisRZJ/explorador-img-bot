use vercel_runtime::{run, service_fn, Error, Request, Response};
use serde_json::{json, Value};

#[tokio::main]
async fn main() -> Result<(), Error> {
    run(service_fn(handler)).await
}

fn json_response(status: u16, body: Value) -> Result<Response<String>, Error> {
    Ok(Response::builder()
        .status(status)
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .header("Access-Control-Allow-Methods", "GET, OPTIONS")
        .header("Access-Control-Allow-Headers", "Content-Type")
        .body(body.to_string())?)
}

async fn handler(req: Request) -> Result<Response<String>, Error> {
    // CORS Preflight
    if req.method() == "OPTIONS" {
        return json_response(200, json!({}));
    }

    // Extraer query string de la URI (sin crate externo)
    let uri = req.uri().to_string();
    let query_str = uri.split('?').nth(1).unwrap_or("");

    let mut tags = "";
    let mut nsfw = "false";
    for pair in query_str.split('&') {
        let mut kv = pair.splitn(2, '=');
        match (kv.next(), kv.next()) {
            (Some("tags"), Some(v)) => tags = v,
            (Some("nsfw"), Some(v)) => nsfw = v,
            _ => {}
        }
    }

    let is_nsfw = nsfw == "true";
    let domain = if is_nsfw { "e621.net" } else { "e926.net" };

    // Decodificar %20/+ en espacios y añadir filtro de rating en modo SFW
    let tags_decoded = tags.replace("%20", " ").replace('+', " ");
    let search_tags = if is_nsfw {
        tags_decoded.clone()
    } else {
        format!("{} rating:safe", tags_decoded)
    };

    let encoded_tags = search_tags.replace(' ', "+");
    let target_url = format!("https://{}/posts.json?tags={}&limit=50", domain, encoded_tags);

    // Cliente HTTP con el User-Agent que requiere e621 en su política de acceso
    let client = match reqwest::Client::builder()
        .user_agent("NekoExplorer/1.0 (by LuisRZJ on e621)")
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            return json_response(500, json!({
                "error": format!("Error construyendo el cliente HTTP: {}", e)
            }));
        }
    };

    let resp = match client
        .get(&target_url)
        .header("Accept", "application/json")
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            return json_response(500, json!({
                "error": format!("Error de red al conectar con {}: {}", domain, e)
            }));
        }
    };

    if !resp.status().is_success() {
        let status_code = resp.status().as_u16();
        let body_text = resp.text().await.unwrap_or_default();
        let short_error = if body_text.starts_with('<') {
            // Cloudflare devuelve páginas HTML — no las reenviamos completas
            format!("Cloudflare bloqueó la petición (HTTP {}). Inténtalo más tarde.", status_code)
        } else {
            let truncated = &body_text[..body_text.len().min(200)];
            format!("Error de {} (HTTP {}): {}", domain, status_code, truncated)
        };
        return json_response(500, json!({ "error": short_error }));
    }

    let json_data: Value = match resp.json().await {
        Ok(v) => v,
        Err(e) => {
            return json_response(500, json!({
                "error": format!("Error al parsear la respuesta JSON de {}: {}", domain, e)
            }));
        }
    };

    let posts = match json_data.get("posts").and_then(|p| p.as_array()) {
        Some(p) if !p.is_empty() => p,
        _ => {
            return json_response(404, json!({
                "error": "No se encontraron imágenes para esta categoría."
            }));
        }
    };

    // Filtrar solo posts con imagen de tipo jpg/png/gif y URL no nula
    let valid_posts: Vec<&Value> = posts
        .iter()
        .filter(|p| {
            p.get("file")
                .and_then(|f| f.get("url"))
                .map(|u| !u.is_null())
                .unwrap_or(false)
                && p.get("file")
                    .and_then(|f| f.get("ext"))
                    .and_then(|e| e.as_str())
                    .map(|ext| matches!(ext, "jpg" | "png" | "gif"))
                    .unwrap_or(false)
        })
        .collect();

    if valid_posts.is_empty() {
        return json_response(404, json!({
            "error": "No se encontraron imágenes estáticas válidas (solo había vídeos webm/swf)."
        }));
    }

    // Selección pseudo-aleatoria usando los nanosegundos del reloj del sistema
    let idx = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.subsec_nanos() as usize)
        .unwrap_or(0)
        % valid_posts.len();

    let post = valid_posts[idx];
    let image_url = post["file"]["url"].as_str().unwrap_or("");

    let artist = post
        .get("tags")
        .and_then(|t| t.get("artist"))
        .and_then(|a| a.as_array())
        .and_then(|a| a.first())
        .and_then(|a| a.as_str())
        .unwrap_or("Artista Desconocido");

    let artist_url = format!(
        "https://{}/posts?tags={}",
        domain,
        artist.replace(' ', "+")
    );

    json_response(200, json!({
        "url": image_url,
        "artist": artist,
        "artist_url": artist_url
    }))
}
