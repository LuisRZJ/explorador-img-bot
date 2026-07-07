use reqwest::header::{HeaderMap, HeaderValue, USER_AGENT, ACCEPT};
use rand::seq::SliceRandom;
use serde_json::{json, Value};
use vercel_runtime::{run, Body, Error, Request, Response, StatusCode};
use url::Url;
use std::collections::HashMap;

#[tokio::main]
async fn main() -> Result<(), Error> {
    run(handler).await
}

pub async fn handler(req: Request) -> Result<Response<Body>, Error> {
    // CORS Preflight
    if req.method() == "OPTIONS" {
        return Ok(Response::builder()
            .status(StatusCode::OK)
            .header("Access-Control-Allow-Origin", "*")
            .header("Access-Control-Allow-Methods", "GET, OPTIONS")
            .header("Access-Control-Allow-Headers", "Content-Type")
            .body(Body::Empty)?);
    }

    // Parse query string
    let parsed_url = Url::parse(&req.uri().to_string()).unwrap_or_else(|_| Url::parse("http://localhost/").unwrap());
    let query: HashMap<_, _> = parsed_url.query_pairs().into_owned().collect();
    
    let tags = query.get("tags").map(|s| s.as_str()).unwrap_or("");
    let nsfw = query.get("nsfw").map(|s| s.as_str()).unwrap_or("false");
    
    let is_nsfw = nsfw == "true";
    let domain = if is_nsfw { "e621.net" } else { "e926.net" };
    
    let mut search_tags = tags.to_string();
    if !is_nsfw {
        search_tags.push_str(" rating:safe");
    }
    
    let encoded_tags = urlencoding::encode(&search_tags);
    let target_url = format!("https://{}/posts.json?tags={}&limit=50", domain, encoded_tags);

    // Setup HTTP client con el mismo User-Agent para intentar evadir el Cloudflare IP block
    let mut headers = HeaderMap::new();
    headers.insert(USER_AGENT, HeaderValue::from_static("NekoExplorer/1.0 (by LuisRZJ on e621)"));
    headers.insert(ACCEPT, HeaderValue::from_static("application/json"));

    let client_result = reqwest::Client::builder()
        .default_headers(headers)
        .build();
        
    let client = match client_result {
        Ok(c) => c,
        Err(e) => {
             return Ok(Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .header("Access-Control-Allow-Origin", "*")
                .header("Content-Type", "application/json")
                .body(Body::Text(json!({ "error": format!("Error creando reqwest client: {}", e) }).to_string()))?);
        }
    };

    // Make request
    let resp = client.get(&target_url).send().await;
    
    let response = match resp {
        Ok(r) => r,
        Err(e) => {
            return Ok(Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .header("Access-Control-Allow-Origin", "*")
                .header("Content-Type", "application/json")
                .body(Body::Text(json!({ "error": format!("Error de red al conectar con e621: {}", e) }).to_string()))?);
        }
    };

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Ok(Response::builder()
            .status(StatusCode::INTERNAL_SERVER_ERROR)
            .header("Access-Control-Allow-Origin", "*")
            .header("Content-Type", "application/json")
            .body(Body::Text(json!({ "error": format!("Error de {}: {} {}", domain, status, text) }).to_string()))?);
    }

    let json_data: Value = response.json().await?;
    let posts = json_data.get("posts").and_then(|p| p.as_array());
    
    if posts.is_none() || posts.unwrap().is_empty() {
        return Ok(Response::builder()
            .status(StatusCode::NOT_FOUND)
            .header("Access-Control-Allow-Origin", "*")
            .header("Content-Type", "application/json")
            .body(Body::Text(json!({ "error": "No se encontraron imágenes para esta categoría." }).to_string()))?);
    }

    let posts = posts.unwrap();
    let valid_posts: Vec<&Value> = posts.iter().filter(|p| {
        if let Some(file) = p.get("file") {
            if let Some(url) = file.get("url") {
                if !url.is_null() {
                    if let Some(ext) = file.get("ext").and_then(|e| e.as_str()) {
                        return ext == "jpg" || ext == "png" || ext == "gif";
                    }
                }
            }
        }
        false
    }).collect();

    if valid_posts.is_empty() {
        return Ok(Response::builder()
            .status(StatusCode::NOT_FOUND)
            .header("Access-Control-Allow-Origin", "*")
            .header("Content-Type", "application/json")
            .body(Body::Text(json!({ "error": "No se encontraron imágenes válidas." }).to_string()))?);
    }

    let mut rng = rand::thread_rng();
    let random_post = valid_posts.choose(&mut rng).unwrap();
    
    let url = random_post["file"]["url"].as_str().unwrap_or("");
    
    let mut artist = "Artista Desconocido".to_string();
    if let Some(tags) = random_post.get("tags") {
        if let Some(artists) = tags.get("artist").and_then(|a| a.as_array()) {
            if !artists.is_empty() {
                artist = artists[0].as_str().unwrap_or("Artista Desconocido").to_string();
            }
        }
    }

    let artist_url = format!("https://{}/posts?tags={}", domain, urlencoding::encode(&artist));

    Ok(Response::builder()
        .status(StatusCode::OK)
        .header("Access-Control-Allow-Origin", "*")
        .header("Content-Type", "application/json")
        .body(Body::Text(json!({
            "url": url,
            "artist": artist,
            "artist_url": artist_url
        }).to_string()))?)
}
