// js/image-compressor.js - Image compression utility

class ImageCompressor {
    static compressImage(file, maxWidth = 200, maxHeight = 200, quality = 0.7) {
        return new Promise((resolve, reject) => {
            if (!file.type.match('image.*')) {
                reject(new Error('File is not an image'));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Calculate new dimensions
                    if (width > height) {
                        if (width > maxWidth) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = Math.round((width * maxHeight) / height);
                            height = maxHeight;
                        }
                    }

                    // Set canvas dimensions
                    canvas.width = width;
                    canvas.height = height;

                    // Draw and compress image
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert to base64 with compression
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                    
                    // Calculate size
                    const originalSize = file.size;
                    const compressedSize = Math.round((compressedDataUrl.length * 3) / 4); // Approximate
                    
                    console.log(`📸 Image compressed: ${this.formatBytes(originalSize)} → ${this.formatBytes(compressedSize)}`);
                    
                    resolve({
                        dataUrl: compressedDataUrl,
                        width: width,
                        height: height,
                        originalSize: originalSize,
                        compressedSize: compressedSize,
                        compressionRatio: Math.round((1 - (compressedSize / originalSize)) * 100)
                    });
                };
                
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = e.target.result;
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }

    static formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    static getBase64Size(base64String) {
        // Remove data URL prefix
        const base64 = base64String.replace(/^data:image\/\w+;base64,/, '');
        // Calculate size in bytes
        return (base64.length * 3) / 4;
    }

    static isBase64TooLarge(base64String, maxKB = 100) {
        const sizeInBytes = this.getBase64Size(base64String);
        const sizeInKB = sizeInBytes / 1024;
        return sizeInKB > maxKB;
    }

    static compressBase64Image(base64String, maxWidth = 200, maxHeight = 200, quality = 0.6) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedDataUrl);
            };
            
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = base64String;
        });
    }
}