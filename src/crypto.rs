use aes_gcm::aead::{Aead, KeyInit, OsRng};
use aes_gcm::{Aes256Gcm, Nonce};
use argon2::{Argon2, Params};
use base64::{Engine as _, engine::general_purpose};
use rand::RngCore;
use std::error::Error;

fn derive_key(password: &str, salt: &[u8]) -> [u8; 32] {
    let params = Params::new(
        65536,    // 64 MB memory cost
        3,        // time cost (iterations)  
        4,        // parallelism
        Some(32)  // output length
    ).unwrap();
    
    let argon2 = Argon2::new(
        argon2::Algorithm::Argon2id,
        argon2::Version::V0x13,
        params
    );
    
    let mut key = [0u8; 32];
    argon2.hash_password_into(password.as_bytes(), salt, &mut key).unwrap();
    key
}

pub fn encrypt_json(plaintext: &str, password: &str) -> Result<String, Box<dyn Error>> {
    let mut salt = [0u8; 16];
    let mut nonce = [0u8; 12];
    OsRng.fill_bytes(&mut salt);
    OsRng.fill_bytes(&mut nonce);

    let key = derive_key(password, &salt);
    let cipher = Aes256Gcm::new_from_slice(&key).unwrap();
    let ciphertext = cipher.encrypt(Nonce::from_slice(&nonce), plaintext.as_bytes()).map_err(|e| format!("Encryption failed: {:?}", e))?;

    let mut encrypted_data = Vec::new();
    encrypted_data.extend_from_slice(&salt);
    encrypted_data.extend_from_slice(&nonce);
    encrypted_data.extend_from_slice(&ciphertext);

    Ok(general_purpose::STANDARD.encode(&encrypted_data))
}

pub fn decrypt_json(encoded: &str, password: &str) -> Result<String, Box<dyn Error>> {
    let data = general_purpose::STANDARD.decode(encoded)?;
    if data.len() < 28 {
        return Err("Invalid encrypted data".into());
    }

    let salt = &data[..16];
    let nonce = &data[16..28];
    let ciphertext = &data[28..];

    let key = derive_key(password, salt);
    let cipher = Aes256Gcm::new_from_slice(&key).unwrap();
    let plaintext = cipher.decrypt(Nonce::from_slice(nonce), ciphertext).map_err(|e| format!("Decryption failed: {:?}", e))?;

    Ok(String::from_utf8(plaintext)?)
}
