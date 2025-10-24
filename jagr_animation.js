// JAG-R Animation JavaScript

class JAGRAnimation {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // Animation state
        this.isPlaying = false;
        this.currentAngle = 0.01;
        this.animationSpeed = 0.01;
        this.maxAngle = Math.PI - 0.01;
        
        // Points and geometry
        this.points = [];
        this.circles = [];
        this.optimalPoint = null;
        this.optimalAngle = null;
        this.foundOptimal = false;
        
        // Visual parameters
        this.pointRadius = 8;
        this.centerRadius = 5;
        this.optimalRadius = 10;
        
        // Initialize
        this.generatePoints(20);
        this.setupEventListeners();
        this.draw();
    }
    
    generatePoints(noise) {
        // Generate 4 points in a roughly square pattern with noise
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const baseSize = 150;
        
        const basePoints = [
            [centerX - baseSize, centerY - baseSize],
            [centerX + baseSize, centerY - baseSize],
            [centerX - baseSize, centerY + baseSize],
            [centerX + baseSize, centerY + baseSize]
        ];
        
        this.points = basePoints.map(([x, y]) => ({
            x: x + (Math.random() - 0.5) * noise * 2,
            y: y + (Math.random() - 0.5) * noise * 2
        }));
        
        this.reset();
    }
    
    setupEventListeners() {
        // Angle slider
        const angleSlider = document.getElementById('angleSlider');
        const angleValue = document.getElementById('angleValue');
        angleSlider.addEventListener('input', (e) => {
            this.currentAngle = parseFloat(e.target.value);
            angleValue.textContent = this.currentAngle.toFixed(2) + ' rad';
            if (!this.isPlaying) {
                this.calculateCircles(this.currentAngle);
                this.draw();
            }
        });
        
        // Speed slider
        const speedSlider = document.getElementById('speedSlider');
        const speedValue = document.getElementById('speedValue');
        speedSlider.addEventListener('input', (e) => {
            this.animationSpeed = parseFloat(e.target.value);
            speedValue.textContent = this.animationSpeed.toFixed(3);
        });
        
        // Noise slider
        const noiseSlider = document.getElementById('noiseSlider');
        const noiseValue = document.getElementById('noiseValue');
        noiseSlider.addEventListener('input', (e) => {
            noiseValue.textContent = e.target.value;
        });
        
        // Buttons
        document.getElementById('playBtn').addEventListener('click', () => this.play());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pause());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
        document.getElementById('regenerateBtn').addEventListener('click', () => {
            const noise = parseInt(document.getElementById('noiseSlider').value);
            this.generatePoints(noise);
            this.draw();
        });
    }
    
    calculateCircles(theta) {
        this.circles = [];
        const centroid = this.getCentroid();
        
        // Generate circles for each pair of points
        for (let i = 0; i < this.points.length; i++) {
            for (let j = i + 1; j < this.points.length; j++) {
                const p1 = this.points[i];
                const p2 = this.points[j];
                
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const d = Math.sqrt(dx * dx + dy * dy);
                
                if (d < 0.001) continue;
                
                // Calculate radius for the given angle
                const radius = (d / 2) / Math.cos(theta / 2);
                
                // Calculate circle center
                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;
                
                // Perpendicular direction
                const perpX = -dy / d;
                const perpY = dx / d;
                
                // Distance from midpoint to center
                const l = Math.sqrt(radius * radius - (d / 2) * (d / 2));
                
                // Two possible centers
                const center1 = {
                    x: midX + perpX * l,
                    y: midY + perpY * l
                };
                const center2 = {
                    x: midX - perpX * l,
                    y: midY - perpY * l
                };
                
                // Choose center closer to centroid
                const dist1 = this.distance(center1, centroid);
                const dist2 = this.distance(center2, centroid);
                
                const center = dist1 < dist2 ? center1 : center2;
                
                this.circles.push({
                    center: center,
                    radius: radius,
                    p1: p1,
                    p2: p2
                });
            }
        }
    }
    
    checkAllCirclesOverlap() {
        if (this.circles.length < 2) return false;
        
        for (let i = 0; i < this.circles.length; i++) {
            for (let j = i + 1; j < this.circles.length; j++) {
                const c1 = this.circles[i];
                const c2 = this.circles[j];
                const dist = this.distance(c1.center, c2.center);
                
                if (dist > c1.radius + c2.radius) {
                    return false;
                }
            }
        }
        return true;
    }
    
    findOptimalPoint() {
        if (this.circles.length < 2) return null;
        
        let maxDist = -Infinity;
        let pair = null;
        
        // Find the pair of circles that are "last to overlap"
        for (let i = 0; i < this.circles.length; i++) {
            for (let j = i + 1; j < this.circles.length; j++) {
                const c1 = this.circles[i];
                const c2 = this.circles[j];
                const dist = this.distance(c1.center, c2.center);
                const overlapDist = c1.radius + c2.radius;
                const diff = overlapDist - dist;
                
                if (diff < maxDist || maxDist === -Infinity) {
                    maxDist = diff;
                    pair = [i, j];
                }
            }
        }
        
        if (!pair) return null;
        
        const [i, j] = pair;
        const c1 = this.circles[i];
        const c2 = this.circles[j];
        
        // Calculate contact point
        const dx = c2.center.x - c1.center.x;
        const dy = c2.center.y - c1.center.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 0.001) return c1.center;
        
        const dirX = dx / dist;
        const dirY = dy / dist;
        
        return {
            x: c1.center.x + dirX * c1.radius,
            y: c1.center.y + dirY * c1.radius
        };
    }
    
    distance(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    getCentroid() {
        const sum = this.points.reduce((acc, p) => ({
            x: acc.x + p.x,
            y: acc.y + p.y
        }), {x: 0, y: 0});
        
        return {
            x: sum.x / this.points.length,
            y: sum.y / this.points.length
        };
    }
    
    play() {
        this.isPlaying = true;
        document.getElementById('playBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;
        document.getElementById('playBtn').classList.add('playing');
        this.animate();
    }
    
    pause() {
        this.isPlaying = false;
        document.getElementById('playBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('playBtn').classList.remove('playing');
    }
    
    reset() {
        this.pause();
        this.currentAngle = 0.01;
        this.optimalPoint = null;
        this.optimalAngle = null;
        this.foundOptimal = false;
        document.getElementById('angleSlider').value = 0.01;
        document.getElementById('angleValue').textContent = '0.01 rad';
        this.calculateCircles(this.currentAngle);
        this.draw();
    }
    
    animate() {
        if (!this.isPlaying) return;
        
        this.currentAngle += this.animationSpeed;
        
        if (this.currentAngle >= this.maxAngle) {
            this.currentAngle = this.maxAngle;
            this.pause();
        }
        
        document.getElementById('angleSlider').value = this.currentAngle;
        document.getElementById('angleValue').textContent = this.currentAngle.toFixed(2) + ' rad';
        
        this.calculateCircles(this.currentAngle);
        
        // Check if all circles overlap
        if (!this.foundOptimal && this.checkAllCirclesOverlap()) {
            this.optimalPoint = this.findOptimalPoint();
            this.optimalAngle = this.currentAngle;
            this.foundOptimal = true;
            this.pause();
        }
        
        this.draw();
        
        if (this.isPlaying) {
            requestAnimationFrame(() => this.animate());
        }
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#fafafa';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw grid
        this.drawGrid();
        
        // Draw intersection area if circles overlap
        const allOverlap = this.checkAllCirclesOverlap();
        if (allOverlap && this.circles.length > 0) {
            this.drawIntersectionArea();
        }
        
        // Draw circles
        this.circles.forEach(circle => {
            this.drawCircle(circle);
        });
        
        // Draw input points
        this.points.forEach(point => {
            this.ctx.fillStyle = '#e74c3c';
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, this.pointRadius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = '#c0392b';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        });
        
        // Draw optimal point if found
        if (this.optimalPoint) {
            this.ctx.fillStyle = '#f39c12';
            this.ctx.beginPath();
            this.ctx.arc(this.optimalPoint.x, this.optimalPoint.y, this.optimalRadius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = '#e67e22';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
            
            // Draw star effect
            this.drawStar(this.optimalPoint.x, this.optimalPoint.y, 5, 20, 10);
        }
        
        // Update info panel
        this.updateInfoPanel(allOverlap);
    }
    
    drawGrid() {
        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.lineWidth = 1;
        
        const gridSize = 50;
        for (let x = 0; x < this.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y < this.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }
    }
    
    drawCircle(circle) {
        this.ctx.strokeStyle = '#3498db';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.arc(circle.center.x, circle.center.y, circle.radius, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }
    
    drawIntersectionArea() {
        // Use canvas clipping to find the intersection of all circles
        if (this.circles.length === 0) return;
        
        this.ctx.save();
        
        // Start with the first circle as our base
        this.ctx.beginPath();
        this.ctx.arc(this.circles[0].center.x, this.circles[0].center.y, 
                    this.circles[0].radius, 0, Math.PI * 2);
        this.ctx.clip();
        
        // Clip by each subsequent circle
        for (let i = 1; i < this.circles.length; i++) {
            this.ctx.beginPath();
            this.ctx.arc(this.circles[i].center.x, this.circles[i].center.y, 
                        this.circles[i].radius, 0, Math.PI * 2);
            this.ctx.clip();
        }
        
        // Now fill the clipped region
        this.ctx.fillStyle = 'rgba(52, 152, 219, 0.3)';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw a border around the intersection region
        this.ctx.strokeStyle = 'rgba(52, 152, 219, 0.8)';
        this.ctx.lineWidth = 2;
        
        // Draw each circle's contribution to the boundary
        for (let i = 0; i < this.circles.length; i++) {
            this.ctx.beginPath();
            this.ctx.arc(this.circles[i].center.x, this.circles[i].center.y, 
                        this.circles[i].radius, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
    
    drawStar(cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;

        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy - outerRadius);
        
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            this.ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            this.ctx.lineTo(x, y);
            rot += step;
        }
        
        this.ctx.lineTo(cx, cy - outerRadius);
        this.ctx.closePath();
        this.ctx.fillStyle = '#f39c12';
        this.ctx.fill();
    }
    
    updateInfoPanel(allOverlap) {
        const degrees = (this.currentAngle * 180 / Math.PI).toFixed(1);
        document.getElementById('currentAngle').textContent = 
            `${this.currentAngle.toFixed(2)} rad (${degrees}°)`;
        
        document.getElementById('overlapStatus').textContent = allOverlap ? 'Yes ✓' : 'No ✗';
        document.getElementById('overlapStatus').style.color = allOverlap ? '#2ecc71' : '#e74c3c';
        
        if (allOverlap && this.circles.length > 0) {
            // Rough estimate of intersection area
            const minRadius = Math.min(...this.circles.map(c => c.radius));
            const area = Math.PI * minRadius * minRadius;
            document.getElementById('intersectionArea').textContent = 
                `~${area.toFixed(0)} px²`;
        } else {
            document.getElementById('intersectionArea').textContent = 'N/A';
        }
        
        if (this.foundOptimal) {
            const optDegrees = (this.optimalAngle * 180 / Math.PI).toFixed(1);
            document.getElementById('optimalFound').textContent = 
                `Yes! at θ = ${this.optimalAngle.toFixed(3)} rad (${optDegrees}°)`;
            document.getElementById('optimalFound').style.color = '#2ecc71';
            document.getElementById('optimalFound').style.fontWeight = 'bold';
        } else {
            document.getElementById('optimalFound').textContent = 'Not yet';
            document.getElementById('optimalFound').style.color = '#e74c3c';
            document.getElementById('optimalFound').style.fontWeight = 'normal';
        }
    }
}

// Initialize when page loads
window.addEventListener('load', () => {
    new JAGRAnimation();
});