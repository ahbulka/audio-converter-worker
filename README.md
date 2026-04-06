# Audio Converter Worker

Ücretsiz Railway/Fly.io deploy için FFmpeg tabanlı ses dönüştürme servisi.

## Deploy Talimatları

### Railway.app (En Kolay)

1. Railway hesabı oluştur: https://railway.app
2. "New Project" → "Deploy from GitHub repo"
3. Bu `audio-worker` klasörünü GitHub'a push et
4. Environment variables ekle:
   - `SUPABASE_URL` = https://your-project.supabase.co
   - `SUPABASE_SERVICE_KEY` = service_role key
5. Deploy! 🚀

### Fly.io (Alternatif)

```bash
# Fly.io CLI kurulum
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Launch
fly launch --name audio-converter

# Secrets ekle
fly secrets set SUPABASE_URL=https://...
fly secrets set SUPABASE_SERVICE_KEY=...
```

### Environment Variables

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...  # service_role key, NOT anon key
PORT=3000
```

## API Endpoints

### POST /convert

Ses dosyasını WebM/Opus formatına dönüştürür ve Supabase'e yükler.

**Request:**
- `audio`: File (multipart/form-data)
- `messageId`: String (opsiyonel)
- `bucket`: String (opsiyonel, default: "audio")
- `storagePath`: String (opsiyonel)

**Response:**
```json
{
  "success": true,
  "messageId": "msg_123...",
  "convertedPath": "converted/msg_123.webm",
  "publicUrl": "https://...supabase.co/...",
  "sizeBytes": 15234,
  "mimeType": "audio/webm"
}
```

### GET /status

FFmpeg durumunu kontrol et.

## Testing

```bash
curl -X POST https://YOUR_WORKER_URL/convert \
  -F "audio=@/path/to/test.m4a" \
  -F "messageId=test_123"
```

## FFmpeg Ayarları

- **Codec**: libopus
- **Sample Rate**: 48000 Hz
- **Channels**: 1 (mono)
- **Bitrate**: 32 kbps
- **Format**: WebM

Bu ayarlar ile:
- ✅ Tüm tarayıcılar çalıştırır
- ✅ Küçük dosya boyutu
- ✅ Hızlı dönüşüm
