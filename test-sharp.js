const sharp = require('sharp');
const fs = require('fs');

async function testSharp() {
    console.log("Generating 10MB raw image (4000x2000 px, 3 channels, random noise)...");
    
    // Create random buffer of size 24,000,000 bytes (4000x2000x3)
    const buf = Buffer.alloc(4000 * 2000 * 3);
    for(let i=0; i<buf.length; i++) buf[i] = Math.floor(Math.random() * 256);

    const generated = sharp(buf, { raw: { width: 4000, height: 2000, channels: 3 } });

    console.log("Resizing with API code: .resize(150, 150, { fit: 'cover' }).jpeg({quality: 80})");
    const outBuffer = await generated
        .resize(150, 150, { fit: 'cover', position: 'attention' })
        .jpeg({ quality: 80 })
        .toBuffer();

    console.log(`Original buffer size: ${(buf.length / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Compressed avatar output size: ${(outBuffer.length / 1024).toFixed(2)} KB`);
    
    if (outBuffer.length < 50 * 1024) {
        console.log("SUCCESS: Image is under 50KB.");
    }
}

testSharp();
