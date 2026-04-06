import express from "express"
import multer from "multer"
import { exec } from "child_process"
import fs from "fs"
import { createClient } from "@supabase/supabase-js"

const app = express()
const upload = multer({ dest: "/tmp/uploads/" })

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "audio-converter" })
})

// Convert audio endpoint
app.post("/convert", upload.single("audio"), async (req, res) => {
  const inputPath = req.file?.path
  const messageId = req.body?.messageId || `msg_${Date.now()}`
  const bucket = req.body?.bucket || "audio"
  const inputStoragePath = req.body?.storagePath

  if (!inputPath) {
    return res.status(400).json({ error: "No audio file provided" })
  }

  const tempOutput = `/tmp/${messageId}_converted.webm`
  
  console.log(`[convert] Starting conversion for ${messageId}`)

  // FFmpeg command: Convert any format to WebM/Opus
  // -ar 48000: 48kHz sample rate
  // -ac 1: Mono channel
  // -c:a libopus: Opus codec
  // -b:a 32k: 32kbps bitrate (small files, good quality)
  const cmd = `ffmpeg -i "${inputPath}" -vn -ar 48000 -ac 1 -c:a libopus -b:a 32k -f webm "${tempOutput}"`

  exec(cmd, async (err, stdout, stderr) => {
    // Cleanup input file
    try { fs.unlinkSync(inputPath) } catch {}

    if (err) {
      console.error(`[convert] FFmpeg error for ${messageId}:`, err)
      return res.status(500).json({ 
        error: "Conversion failed", 
        details: err.message 
      })
    }

    console.log(`[convert] FFmpeg success for ${messageId}`)

    try {
      // Read converted file
      const outputBuffer = fs.readFileSync(tempOutput)
      const outputSize = outputBuffer.length
      
      // Generate output path
      const outputFileName = `${messageId}_converted.webm`
      const outputStoragePath = inputStoragePath 
        ? inputStoragePath.replace(/\.[^.]+$/, '.webm')
        : `converted/${outputFileName}`

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(outputStoragePath, outputBuffer, {
          contentType: "audio/webm",
          upsert: true,
        })

      if (uploadError) {
        console.error(`[convert] Upload error for ${messageId}:`, uploadError)
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(outputStoragePath)

      console.log(`[convert] Success for ${messageId}: ${publicUrl}`)

      // Cleanup output file
      try { fs.unlinkSync(tempOutput) } catch {}

      res.json({
        success: true,
        messageId,
        originalPath: inputStoragePath,
        convertedPath: outputStoragePath,
        publicUrl,
        sizeBytes: outputSize,
        mimeType: "audio/webm",
      })

    } catch (error) {
      console.error(`[convert] Processing error for ${messageId}:`, error)
      try { fs.unlinkSync(tempOutput) } catch {}
      res.status(500).json({ 
        error: "Processing failed", 
        details: error.message 
      })
    }
  })
})

// Status endpoint (for checking if worker is healthy)
app.get("/status", (req, res) => {
  exec("ffmpeg -version", (err, stdout) => {
    if (err) {
      return res.status(500).json({ 
        status: "error", 
        ffmpeg: "not available" 
      })
    }
    const version = stdout.split("\n")[0]
    res.json({ 
      status: "ok", 
      ffmpeg: version 
    })
  })
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`🎵 Audio converter worker running on port ${PORT}`)
  console.log(`📡 Supabase URL: ${process.env.SUPABASE_URL || "NOT SET"}`)
})
