// 🔍 OCR Coordinate Debug Script v2.0
// Paste this in browser console (F12) when PDF is open in modal

function debugOCRCoordinates() {
    console.log('🔍 Starting OCR Coordinate Debug v2.0...');
    
    // Find the PDF container
    const pdfContainer = document.querySelector('.react-pdf__Page');
    if (!pdfContainer) {
        console.error('❌ PDF container not found');
        return;
    }
    
    const containerRect = pdfContainer.getBoundingClientRect();
    console.log('📦 PDF Container:', {
        width: containerRect.width,
        height: containerRect.height,
        x: containerRect.x,
        y: containerRect.y
    });
    
    // Test coordinates from the ACTUAL OCR results (from backend logs)
    const testCoordinates = [
        {x: 106, y: 212, width: 90, height: 30, text: 'sediul #1'},
        {x: 525, y: 227, width: 90, height: 30, text: 'sediul #2'}, 
        {x: 944, y: 227, width: 90, height: 30, text: 'sediul #3'},
        {x: 163, y: 1054, width: 90, height: 30, text: 'sediul #4'}
    ];
    
    const imageSize = {width: 1200, height: 1600}; // From backend OCR
    
    console.log('🎯 Testing coordinates:');
    testCoordinates.forEach((coord, index) => {
        console.log(`📍 ${coord.text}: (${coord.x}, ${coord.y}) ${coord.width}x${coord.height}`);
    });
    
    // Clear any existing markers
    document.querySelectorAll('[id^="debug-marker-"]').forEach(el => el.remove());
    
    // Create visual markers with MULTIPLE scaling methods
    testCoordinates.forEach((coord, index) => {
        // Method 1: Simple scaling (current approach)
        const scaleX = containerRect.width / imageSize.width;
        const scaleY = containerRect.height / imageSize.height;
        
        const scaledX = coord.x * scaleX;
        const scaledY = coord.y * scaleY;
        const scaledWidth = coord.width * scaleX;
        const scaledHeight = coord.height * scaleY;
        
        console.log(`🔄 ${coord.text} scaled: (${scaledX.toFixed(1)}, ${scaledY.toFixed(1)}) ${scaledWidth.toFixed(1)}x${scaledHeight.toFixed(1)}`);
        
        // Create marker element
        const marker = document.createElement('div');
        marker.id = `debug-marker-${index}`;
        marker.style.cssText = `
            position: absolute;
            left: ${scaledX}px;
            top: ${scaledY}px;
            width: ${Math.max(scaledWidth, 20)}px;
            height: ${Math.max(scaledHeight, 15)}px;
            background-color: rgba(${index * 60}, 255, ${255 - index * 60}, 0.8);
            border: 3px solid rgb(${index * 60}, 200, ${200 - index * 60});
            z-index: 10000;
            pointer-events: none;
            font-size: 12px;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
        `;
        marker.textContent = `${index + 1}`;
        
        // Position relative to PDF container
        pdfContainer.style.position = 'relative';
        pdfContainer.appendChild(marker);
        
        // Also create a LARGE marker for visibility
        const bigMarker = document.createElement('div');
        bigMarker.id = `debug-big-marker-${index}`;
        bigMarker.style.cssText = `
            position: absolute;
            left: ${scaledX - 10}px;
            top: ${scaledY - 10}px;
            width: ${Math.max(scaledWidth + 20, 40)}px;
            height: ${Math.max(scaledHeight + 20, 30)}px;
            background-color: rgba(${index * 60}, 100, ${255 - index * 60}, 0.3);
            border: 2px dashed rgb(${index * 60}, 255, ${200 - index * 60});
            z-index: 9999;
            pointer-events: none;
            font-size: 10px;
            color: black;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
        `;
        bigMarker.textContent = `BIG ${index + 1}`;
        pdfContainer.appendChild(bigMarker);
    });
    
    console.log('✅ Debug markers created! Look for colored rectangles on the PDF.');
    console.log('🧹 To clear markers, run: clearDebugMarkers()');
    
    // Add clear function to window
    window.clearDebugMarkers = function() {
        document.querySelectorAll('[id^="debug-marker-"]').forEach(el => el.remove());
        document.querySelectorAll('[id^="debug-big-marker-"]').forEach(el => el.remove());
        console.log('🧹 Debug markers cleared');
    };
}

// Function to test with REAL coordinates from browser network tab
function testRealCoordinates(realCoordinates) {
    console.log('🔬 Testing with REAL coordinates from network response...');
    
    if (!realCoordinates || realCoordinates.length === 0) {
        console.error('❌ No real coordinates provided. Usage: testRealCoordinates([{x: 100, y: 200, width: 50, height: 20}, ...])');
        return;
    }
    
    const pdfContainer = document.querySelector('.react-pdf__Page');
    if (!pdfContainer) {
        console.error('❌ PDF container not found');
        return;
    }
    
    const containerRect = pdfContainer.getBoundingClientRect();
    console.log('📦 PDF Container:', containerRect);
    
    // Clear existing markers
    clearDebugMarkers();
    
    realCoordinates.forEach((coord, index) => {
        console.log(`📍 Real coordinate ${index + 1}:`, coord);
        
        // Use the coordinates directly from backend
        const imageWidth = coord.imageWidth || 1200;
        const imageHeight = coord.imageHeight || 1600;
        
        const scaleX = containerRect.width / imageWidth;
        const scaleY = containerRect.height / imageHeight;
        
        const scaledX = coord.x * scaleX;
        const scaledY = coord.y * scaleY;
        const scaledWidth = coord.width * scaleX;
        const scaledHeight = coord.height * scaleY;
        
        console.log(`🔄 Real coord ${index + 1} scaled:`, {
            original: coord,
            scaled: { x: scaledX, y: scaledY, w: scaledWidth, h: scaledHeight },
            scale: { x: scaleX, y: scaleY }
        });
        
        // Create highly visible marker
        const marker = document.createElement('div');
        marker.id = `debug-real-marker-${index}`;
        marker.style.cssText = `
            position: absolute;
            left: ${scaledX}px;
            top: ${scaledY}px;
            width: ${Math.max(scaledWidth, 30)}px;
            height: ${Math.max(scaledHeight, 20)}px;
            background-color: rgba(255, ${index * 50}, 0, 0.8);
            border: 3px solid rgb(255, ${index * 50}, 0);
            z-index: 10001;
            pointer-events: none;
            font-size: 14px;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            box-shadow: 0 0 15px rgba(255,0,0,0.7);
            animation: pulse 2s infinite;
        `;
        marker.textContent = `R${index + 1}`;
        
        pdfContainer.appendChild(marker);
    });
    
    // Add pulse animation
    if (!document.getElementById('debug-pulse-style')) {
        const style = document.createElement('style');
        style.id = 'debug-pulse-style';
        style.textContent = `
            @keyframes pulse {
                0% { transform: scale(1); opacity: 0.8; }
                50% { transform: scale(1.1); opacity: 1; }
                100% { transform: scale(1); opacity: 0.8; }
            }
        `;
        document.head.appendChild(style);
    }
    
    console.log('✅ Real coordinate markers created with PULSE animation!');
}

// Function to extract coordinates from network response
function extractCoordinatesFromResponse() {
    console.log('🔍 How to extract real coordinates:');
    console.log('1. Open Network tab in DevTools');
    console.log('2. Perform OCR search');
    console.log('3. Find the OCR request response');
    console.log('4. Copy the coordinates array from the response');
    console.log('5. Run: testRealCoordinates(yourCoordinatesArray)');
    console.log('');
    console.log('Example:');
    console.log('testRealCoordinates([{x: 100, y: 200, width: 50, height: 20, imageWidth: 1200, imageHeight: 1600}])');
}

// Function to intercept OCR responses automatically
function interceptOCRResponses() {
    console.log('🕵️ Setting up OCR response interceptor...');
    
    // Store original fetch
    const originalFetch = window.fetch;
    
    // Override fetch to intercept OCR responses
    window.fetch = async function(...args) {
        const response = await originalFetch.apply(this, args);
        
        // Check if this is an OCR request
        const url = args[0];
        if (typeof url === 'string' && (url.includes('ocr-search') || url.includes('search'))) {
            console.log('🎯 Intercepted OCR request:', url);
            
            // Clone response to read it without consuming the original
            const clonedResponse = response.clone();
            
            try {
                const data = await clonedResponse.json();
                if (data.results && Array.isArray(data.results)) {
                    console.log('📦 OCR Results intercepted:', data.results.length, 'matches');
                    
                    // Extract coordinates
                    const coordinates = data.results
                        .filter(result => result.coordinates)
                        .map(result => result.coordinates);
                    
                    if (coordinates.length > 0) {
                        console.log('🎯 Extracted coordinates:', coordinates);
                        
                        // Auto-test with real coordinates
                        setTimeout(() => {
                            console.log('🚀 Auto-testing with intercepted coordinates...');
                            testRealCoordinates(coordinates);
                        }, 1000);
                        
                        // Store for manual testing
                        window.lastInterceptedCoordinates = coordinates;
                        console.log('💾 Coordinates stored in window.lastInterceptedCoordinates');
                    } else {
                        console.log('❌ No coordinates found in response');
                    }
                }
            } catch (error) {
                console.log('⚠️ Could not parse OCR response:', error);
            }
        }
        
        return response;
    };
    
    console.log('✅ OCR response interceptor active!');
    console.log('🔄 Now perform an OCR search to automatically capture coordinates');
    
    // Add function to restore original fetch
    window.restoreOriginalFetch = function() {
        window.fetch = originalFetch;
        console.log('🔄 Original fetch restored');
    };
}

// Function to use last intercepted coordinates
function useLastInterceptedCoordinates() {
    if (window.lastInterceptedCoordinates) {
        console.log('🎯 Using last intercepted coordinates...');
        testRealCoordinates(window.lastInterceptedCoordinates);
    } else {
        console.log('❌ No intercepted coordinates available. Run interceptOCRResponses() first and perform a search.');
    }
}

// Function to test different scaling approaches
function testScalingMethods() {
    console.log('🔬 Testing different scaling methods...');
    
    const pdfContainer = document.querySelector('.react-pdf__Page');
    if (!pdfContainer) {
        console.error('❌ PDF container not found');
        return;
    }
    
    const containerRect = pdfContainer.getBoundingClientRect();
    const imageSize = {width: 1200, height: 1600};
    const testCoord = {x: 106, y: 212, width: 90, height: 30};
    
    console.log('📊 Container size:', containerRect.width, 'x', containerRect.height);
    console.log('📊 Image size:', imageSize.width, 'x', imageSize.height);
    console.log('📊 Test coordinate:', testCoord);
    
    // Method 1: Simple scaling (current)
    const scaleX1 = containerRect.width / imageSize.width;
    const scaleY1 = containerRect.height / imageSize.height;
    console.log('🔢 Method 1 (Simple):', {
        x: testCoord.x * scaleX1,
        y: testCoord.y * scaleY1,
        scaleX: scaleX1,
        scaleY: scaleY1
    });
    
    // Method 2: Uniform scaling (maintain aspect ratio)
    const uniformScale = Math.min(scaleX1, scaleY1);
    console.log('🔢 Method 2 (Uniform):', {
        x: testCoord.x * uniformScale,
        y: testCoord.y * uniformScale,
        scale: uniformScale
    });
    
    // Method 3: Percentage-based
    const percentX = testCoord.x / imageSize.width;
    const percentY = testCoord.y / imageSize.height;
    console.log('🔢 Method 3 (Percentage):', {
        x: percentX * containerRect.width,
        y: percentY * containerRect.height,
        percentX: percentX,
        percentY: percentY
    });
}

// Function to analyze PDF page structure
function analyzePDFStructure() {
    console.log('🔍 Analyzing PDF structure...');
    
    const pdfPages = document.querySelectorAll('.react-pdf__Page');
    console.log(`📄 Found ${pdfPages.length} PDF pages`);
    
    pdfPages.forEach((page, index) => {
        const rect = page.getBoundingClientRect();
        const canvas = page.querySelector('canvas');
        const textLayer = page.querySelector('.react-pdf__Page__textContent');
        
        console.log(`📄 Page ${index + 1}:`, {
            size: `${rect.width}x${rect.height}`,
            hasCanvas: !!canvas,
            hasTextLayer: !!textLayer,
            canvasSize: canvas ? `${canvas.width}x${canvas.height}` : 'N/A',
            visible: rect.width > 0 && rect.height > 0
        });
        
        if (textLayer) {
            const textElements = textLayer.querySelectorAll('span');
            console.log(`📝 Text elements on page ${index + 1}:`, textElements.length);
        }
    });
}

// Main debug function
console.log(`
🎯 OCR Debug Tools v2.0 Available:
- debugOCRCoordinates() - Create visual markers for test coordinates
- testRealCoordinates(coordinates) - Test with actual backend coordinates
- interceptOCRResponses() - AUTO-CAPTURE coordinates from OCR requests
- useLastInterceptedCoordinates() - Use automatically captured coordinates
- extractCoordinatesFromResponse() - Manual instructions for getting coordinates
- testScalingMethods() - Test different coordinate scaling approaches  
- analyzePDFStructure() - Analyze PDF page structure
- clearDebugMarkers() - Remove all debug markers

📖 EASY Usage:
1. Open PDF in modal
2. Run interceptOCRResponses() to auto-capture coordinates
3. Perform OCR search - coordinates will be auto-tested!
4. Or run debugOCRCoordinates() for test coordinates
5. Run clearDebugMarkers() to clean up

🚀 AUTOMATIC Mode: interceptOCRResponses() + search = auto-testing!
`);

// Auto-export functions to window
window.debugOCRCoordinates = debugOCRCoordinates;
window.testRealCoordinates = testRealCoordinates;
window.interceptOCRResponses = interceptOCRResponses;
window.useLastInterceptedCoordinates = useLastInterceptedCoordinates;
window.extractCoordinatesFromResponse = extractCoordinatesFromResponse;
window.testScalingMethods = testScalingMethods;
window.analyzePDFStructure = analyzePDFStructure; 