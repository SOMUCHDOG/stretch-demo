// playball.js

// ===========================================
// Arm and Hand Demo with Rubber Band Effect, Smoothing, and Debugging Text
// ===========================================

// Wait for the window to load before initializing the demo
window.onload = () => {
    const demo = new ArmDemo();
};

// =======================
// Class Definitions
// =======================

/**
 * The main demo class that initializes and runs the animation loop.
 */
class ArmDemo {
    constructor() {
        // Get the canvas element and its drawing context
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Physics constants
        this.gravity = 0.8;          // Gravity acceleration
        this.damping = 0.999;         // Damping factor to reduce velocity over time
        this.baseStiffness = 0.2;    // Base spring stiffness
        this.springLength = 5;       // Rest length of the springs (length of each segment)

        // Power and movement variables
        this.power = 1;
        this.maxPower = 100;
        this.charge = false; // Is the hand charging power?

        // Arm segments and hand
        this.segments = [];  // Array to hold arm segments
        this.hand = null;    // The hand particle

        // Platform at the bottom
        this.platform = new Platform(0, this.canvas.height - 20, this.canvas.width, 20);

        // Mouse position for targeting
        this.mouseTarget = { x: this.canvas.width / 2, y: this.canvas.height / 2 };

        // Initialize the demo
        this.init();
    }

    /**
     * Initialize the arm segments and event listeners.
     */
    init() {
        const numSegments = 10;        // Number of segments in the arm
        const segmentLength = this.springLength;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Create particles for the segments starting from the base (shoulder)
        for (let i = 0; i < numSegments; i++) {
            let x = centerX;
            let y = centerY + i * segmentLength;
            let segment = new Particle(x, y);
            this.segments.push(segment);
        }

        // Create the hand particle
        const lastSegment = this.segments[this.segments.length - 1];
        this.hand = new Particle(lastSegment.x, lastSegment.y + segmentLength);

        // Set up event listeners for mouse input
        this.setUpStage();

        // Start the animation loop
        requestAnimationFrame((time) => this.animationLoop(time));
    }

    /**
     * Set up event listeners for user input.
     */
    setUpStage() {
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    }

    /**
     * The main animation loop that updates and renders the demo.
     */
    animationLoop(time) {
        // Update the demo state
        this.update();

        // Clear the canvas for redrawing
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Render the arm, hand, platform, and debugging text
        this.render();

        // Request the next frame
        requestAnimationFrame((time) => this.animationLoop(time));
    }

    /**
     * Update the physics and state of the hand and arm segments.
     */
    update() {
        if (this.charge) {
            this.power = Math.min(this.power * 1.1, this.maxPower);
        }

        // Apply gravity and update hand position
        this.hand.applyForce(0, this.gravity);
        this.hand.update(this.damping);

        // Apply gravity and update segments (except the base)
        for (let i = 1; i < this.segments.length; i++) {
            let segment = this.segments[i];
            segment.applyForce(0, this.gravity);
            segment.update(this.damping);
        }

        // Apply spring forces between connected segments
        this.applySpringForces();

        // Enforce constraints
        this.enforceConstraints();
    }

    /**
     * Apply spring forces between connected segments and the hand.
     */
    applySpringForces() {
        const iterations = 5; // Increase for smoother motion
        for (let k = 0; k < iterations; k++) {
            // Apply spring between hand and last segment
            this.applySpring(this.hand, this.segments[this.segments.length - 1]);

            // Apply springs between segments
            for (let i = this.segments.length - 1; i > 0; i--) {
                this.applySpring(this.segments[i], this.segments[i - 1]);
            }
        }
    }

    /**
     * Apply a spring force between two particles with variable stiffness.
     */
    applySpring(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        if (distance === 0) return;

        const difference = distance - this.springLength;

        // Increase stiffness as the spring stretches
        const stiffness = this.baseStiffness + Math.pow(Math.abs(difference), 1.5) * 0.001;

        const percent = (difference / distance) * stiffness * 0.4;
        const offsetX = dx * percent;
        const offsetY = dy * percent;

        // Adjust positions
        p1.x += offsetX;
        p1.y += offsetY;
        p2.x -= offsetX;
        p2.y -= offsetY;
    }

    /**
     * Enforce constraints like pinning the base and collision detection.
     */
    enforceConstraints() {
        // Pin the base segment
        const base = this.segments[0];
        base.x = this.canvas.width / 2;
        base.y = this.canvas.height / 2;
        base.lastX = base.x;
        base.lastY = base.y;

        // Collision with platform
        this.platform.checkCollision(this.hand);
        for (let i = 1; i < this.segments.length; i++) {
            this.platform.checkCollision(this.segments[i]);
        }

        // Keep particles within canvas boundaries
        for (let particle of [this.hand, ...this.segments]) {
            // Left boundary
            if (particle.x < particle.radius) {
                particle.x = particle.radius;
                let vx = particle.x - particle.lastX;
                particle.lastX = particle.x + vx * 0.5;
            }
            // Right boundary
            if (particle.x > this.canvas.width - particle.radius) {
                particle.x = this.canvas.width - particle.radius;
                let vx = particle.x - particle.lastX;
                particle.lastX = particle.x + vx * 0.5;
            }
            // Top boundary
            if (particle.y < particle.radius) {
                particle.y = particle.radius;
                let vy = particle.y - particle.lastY;
                particle.lastY = particle.y + vy * 0.5;
            }
            // Bottom boundary
            if (particle.y > this.canvas.height - particle.radius) {
                particle.y = this.canvas.height - particle.radius;
                let vy = particle.y - particle.lastY;
                particle.lastY = particle.y + vy * 0.5;
            }
        }
    }

    /**
     * Render the arm, hand, platform, and debugging text.
     */
    render() {
        // Draw the platform
        this.platform.draw(this.ctx);

        // Draw springs
        this.ctx.strokeStyle = 'yellow';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        for (let i = 0; i < this.segments.length - 1; i++) {
            this.ctx.moveTo(this.segments[i].x, this.segments[i].y);
            this.ctx.lineTo(this.segments[i + 1].x, this.segments[i + 1].y);
        }
        this.ctx.moveTo(this.segments[this.segments.length - 1].x, this.segments[this.segments.length - 1].y);
        this.ctx.lineTo(this.hand.x, this.hand.y);
        this.ctx.stroke();

        // Draw particles
        for (let segment of this.segments) {
            segment.draw(this.ctx);
        }
        this.hand.draw(this.ctx, 'green');

        // Render power bar
        this.renderPowerBar();

        // Render debugging text
        this.renderDebugInfo();
    }

    /**
     * Render the power bar.
     */
    renderPowerBar() {
        const barWidth = 200;
        const barHeight = 20;
        const barX = (this.canvas.width - barWidth) / 2;
        const barY = this.canvas.height - 50;
        const powerPercent = Math.min(this.power / this.maxPower, 1);

        // Background
        this.ctx.fillStyle = 'gray';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);

        // Power level
        this.ctx.fillStyle = 'green';
        this.ctx.fillRect(barX, barY, barWidth * powerPercent, barHeight);

        // Border
        this.ctx.strokeStyle = 'white';
        this.ctx.strokeRect(barX, barY, barWidth, barHeight);
    }

    /**
     * Render debugging information on the canvas.
     */
    renderDebugInfo() {
        this.ctx.fillStyle = 'white';
        this.ctx.font = '14px Arial';

        // Display hand position
        this.ctx.fillText(`Hand Position: x=${this.hand.x.toFixed(2)}, y=${this.hand.y.toFixed(2)}`, 10, 20);

        // Display hand velocity
        const vx = ((this.hand.x - this.hand.lastX) / (1 - this.damping)).toFixed(2);
        const vy = ((this.hand.y - this.hand.lastY) / (1 - this.damping)).toFixed(2);
        this.ctx.fillText(`Hand Velocity: vx=${vx}, vy=${vy}`, 10, 40);

        // Display power
        this.ctx.fillText(`Power: ${this.power.toFixed(2)}`, 10, 60);

        // Display segment positions
        for (let i = 0; i < this.segments.length; i++) {
            let segment = this.segments[i];
            this.ctx.fillText(`Seg ${i}: x=${segment.x.toFixed(2)}, y=${segment.y.toFixed(2)}`, 10, 80 + i * 20);
            if (i >= 5) {
                // Avoid text going off-screen
                break;
            }
        }
    }

    /**
     * Mouse down event handler.
     */
    onMouseDown(event) {
        this.mouseTarget.x = event.clientX - this.canvas.offsetLeft;
        this.mouseTarget.y = event.clientY - this.canvas.offsetTop;

        this.power = 10;
        this.charge = true;
    }

    /**
     * Mouse up event handler.
     */
    onMouseUp(event) {
        this.charge = false;

        const mouseX = event.clientX - this.canvas.offsetLeft;
        const mouseY = event.clientY - this.canvas.offsetTop;
        const angle = Math.atan2(mouseY - this.hand.y, mouseX - this.hand.x);

        const speed = this.power * 1.2; // Adjusted speed multiplier
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        // Adjust last positions for Verlet integration
        this.hand.lastX = this.hand.x - vx;
        this.hand.lastY = this.hand.y - vy;
    }
}

/**
 * Particle class using Verlet integration.
 */
class Particle {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;

        // Previous position
        this.lastX = x;
        this.lastY = y;

        // Acceleration
        this.ax = 0;
        this.ay = 0;

        this.radius = 5;
    }

    applyForce(fx, fy) {
        this.ax += fx;
        this.ay += fy;
    }

    update(damping) {
        const tempX = this.x;
        const tempY = this.y;

        const vx = (this.x - this.lastX) * damping;
        const vy = (this.y - this.lastY) * damping;

        this.x += vx + this.ax;
        this.y += vy + this.ay;

        this.lastX = tempX;
        this.lastY = tempY;

        this.ax = 0;
        this.ay = 0;
    }

    draw(ctx, color = 'yellow') {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

/**
 * Platform class for collision detection.
 */
class Platform {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    checkCollision(particle) {
        const closestX = Math.max(this.x, Math.min(particle.x, this.x + this.width));
        const closestY = Math.max(this.y, Math.min(particle.y, this.y + this.height));

        const dx = particle.x - closestX;
        const dy = particle.y - closestY;

        if (dx * dx + dy * dy < particle.radius * particle.radius) {
            if (particle.y < this.y) {
                particle.y = this.y - particle.radius;
            } else {
                particle.y = this.y + this.height + particle.radius;
            }

            // Reflect velocity
            let vy = particle.y - particle.lastY;
            particle.lastY = particle.y + vy * 0.5; // Adjust bounce
        }
    }

    draw(ctx) {
        ctx.fillStyle = 'gray';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}