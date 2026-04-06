import express from "express"
import { exec } from "child_process"
import fs from "fs"
import { createClient } from "@supabase/supabase-js"

const app = express()
app.use(express.json())

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "audio-converter" })
})

// Convert audio endpoint - downloads from Supabase, converts, uploads back
app.post("/convert", async (req, res) => {
  const { messageId, bucket, storagePath, clientId } = req.body
  
  if (!storagePath || !bucket) {
    return res.status(400).json({ error: "Missing storagePath or bucket" })
  }

  const tempInput = `/tmp/${messageId || clientId || Date.now()}_input`
  const tempOutput = `/tmp/${messageId || clientId || Date.now()}_converted.webm`

  // URL-decode storage path (received as URL-encoded from client)
  const decodedStoragePath = decodeURIComponent(storagePath)
  console.log(`[convert] Starting conversion for ${messageId || clientId}`)
  console.log(`[convert] Received encoded: ${storagePath.substring(0, 50)}...`)
  console.log(`[convert] Decoded path: ${decodedStoragePath}`)
  console.log(`[convert] Received bucket: ${bucket}`)

  try {
    // Step 1: Get signed URL and download via fetch
    // Use decoded path for Supabase operations
    const sanitizedPath = decodedStoragePath.replace(/[^\x00-\x7F]/g, '')
    console.log(`[convert] Sanitized path: ${sanitizedPath}`)
    
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(sanitizedPath, 60)
    
    if (signedUrlError || !signedUrlData?.signedUrl) {
      throw new Error(`Failed to create signed URL: ${signedUrlError?.message}`)
    }

    // Download via fetch
    const fetchResponse = await fetch(signedUrlData.signedUrl)
    if (!fetchResponse.ok) {
      throw new Error(`Download failed: ${fetchResponse.status}`)
    }

    const arrayBuffer = await fetchResponse.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    fs.writeFileSync(tempInput, buffer)
    console.log(`[convert] Downloaded ${buffer.length} bytes`)

    // Step 2: FFmpeg conversion
    const cmd = `ffmpeg -i "${tempInput}" -vn -ar 48000 -ac 1 -c:a libopus -b:a 32k -f webm "${tempOutput}"`
    
    await new Promise((resolve, reject) => {
      exec(cmd, (err, stdout, stderr) => {
        // Cleanup input
        try { fs.unlinkSync(tempInput) } catch {}
        
        if (err) {
          console.error(`[convert] FFmpeg error:`, err)
          reject(err)
          return
        }
        resolve()
      })
    })

    console.log(`[convert] FFmpeg success`)

    // Step 3: Read output and upload
    const outputBuffer = fs.readFileSync(tempOutput)
    const outputSize = outputBuffer.length
    
    const outputStoragePath = sanitizedPath.replace(/\.[^.]+$/, '.webm')

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(outputStoragePath, outputBuffer, {
        contentType: "audio/webm",
        upsert: true,
      })

    if (uploadError) {
      console.error(`[convert] Upload error:`, uploadError)
      throw uploadError
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(outputStoragePath)

    console.log(`[convert] Success: ${publicUrl}`)

    // Cleanup
    try { fs.unlinkSync(tempOutput) } catch {}

    res.json({
      success: true,
      messageId,
      clientId,
      originalPath: storagePath,
      convertedPath: outputStoragePath,
      publicUrl,
      sizeBytes: outputSize,
      mimeType: "audio/webm",
    })

  } catch (error) {
    console.error(`[convert] Error:`, error)
    // Cleanup
    try { fs.unlinkSync(tempInput) } catch {}
    try { fs.unlinkSync(tempOutput) } catch {}
    
    res.status(500).json({ 
      error: "Conversion failed", 
      details: error.message 
    })
  }
})

// Convert base64 audio endpoint - receives audio directly, converts, uploads
app.post("/convert-base64", async (req, res) => {
  const { base64Audio, outputPath, duration, sizeBytes } = req.body

  if (!base64Audio || !outputPath) {
    return res.status(400).json({ error: "Missing base64Audio or outputPath" })
  }

  const tempInput = `/tmp/${Date.now()}_input.m4a`
  const tempOutput = `/tmp/${Date.now()}_converted.webm`

  console.log(`[convert-base64] Starting conversion`)
  console.log(`[convert-base64] Output path: ${outputPath}`)
  console.log(`[convert-base64] Input size: ${base64Audio.length} chars`)

  try {
    // Step 1: Decode base64 and write to temp file
    const audioBuffer = Buffer.from(base64Audio, 'base64')
    fs.writeFileSync(tempInput, audioBuffer)
    console.log(`[convert-base64] Decoded ${audioBuffer.length} bytes`)

    // Step 2: FFmpeg conversion to WebM/Opus
    const cmd = `ffmpeg -i "${tempInput}" -vn -ar 48000 -ac 1 -c:a libopus -b:a 32k -f webm "${tempOutput}"`

    await new Promise((resolve, reject) => {
      exec(cmd, (err, stdout, stderr) => {
        // Cleanup input
        try { fs.unlinkSync(tempInput) } catch {}

        if (err) {
          console.error(`[convert-base64] FFmpeg error:`, err)
          reject(err)
          return
        }
        resolve()
      })
    })

    console.log(`[convert-base64] FFmpeg success`)

    // Step 3: Read output and upload to Supabase
    const outputBuffer = fs.readFileSync(tempOutput)
    const outputSize = outputBuffer.length

    // Sanitize output path to remove non-ASCII characters
    const sanitizedPath = outputPath.replace(/[^\x00-\x7F]/g, '_')
    console.log(`[convert-base64] Sanitized path: ${sanitizedPath}`)

    const { error: uploadError } = await supabase.storage
      .from('chat-media')
      .upload(sanitizedPath, outputBuffer, {
        contentType: "audio/webm",
        upsert: true,
      })

    if (uploadError) {
      console.error(`[convert-base64] Upload error:`, uploadError)
      throw uploadError
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('chat-media')
      .getPublicUrl(sanitizedPath)

    console.log(`[convert-base64] Success: ${publicUrl}`)

    // Cleanup
    try { fs.unlinkSync(tempOutput) } catch {}

    res.json({
      success: true,
      publicUrl,
      convertedPath: sanitizedPath,
      duration: duration || 0,
      sizeBytes: outputSize,
      mimeType: "audio/webm",
    })

  } catch (error) {
    console.error(`[convert-base64] Error:`, error)
    // Cleanup
    try { fs.unlinkSync(tempInput) } catch {}
    try { fs.unlinkSync(tempOutput) } catch {}

    res.status(500).json({
      error: "Conversion failed",
      details: error.message
    })
  }
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
