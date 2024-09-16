// playball.js

// ===========================================
// Arm and Hand Demo with Sub-Stepping
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
        this.gravity = 9.8;           // Gravity acceleration
        this.damping = 0.99;          // Damping factor to reduce velocity over time
        this.baseStiffness = 0.5;     // Base spring stiffness
        this.springLength = 10;       // Rest length of the springs (length of each segment)

        // Power and movement variables
        this.power = 1;
        this.maxPower = 100;
        this.charge = false; // Is the hand charging power?

        // Arm segments and hand
        this.segments = [];  // Array to hold arm segments
        this.hand = null;    // The hand particle

        // Springs between particles
        this.springs = [];   // Array to hold springs

        // Platform at the bottom
        this.platform = new Platform(0, this.canvas.height - 20, this.canvas.width, 20);

        // Mouse position for targeting
        this.mouseTarget = { x: this.canvas.width / 2, y: this.canvas.height / 2 };

        // Initialize the demo
        this.init();
    }

    /**
     * Initialize the arm segments, springs, and event listeners.
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

        // Create springs between particles
        this.springs = [];

        // Springs between segments
        for (let i = 0; i < this.segments.length - 1; i++) {
            const spring = new Spring(
                this.segments[i],
                this.segments[i + 1],
                segmentLength,
                this.baseStiffness
            );
            this.springs.push(spring);
        }

        // Spring between last segment and hand
        const handSpring = new Spring(
            this.segments[this.segments.length - 1],
            this.hand,
            segmentLength,
            this.baseStiffness
        );
        this.springs.push(handSpring);

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
        if (!this.lastTime) {
            this.lastTime = time;
        }

        // Calculate elapsed time since last frame
        let deltaTime = (time - this.lastTime) / 1000; // Convert milliseconds to seconds
        this.lastTime = time;

        // Cap deltaTime to prevent spiral of death
        deltaTime = Math.min(deltaTime, 0.033); // Max 33ms per frame (approx 30 FPS)

        // Fixed time step
        const timeStep = 0.005; // 5ms per physics update
        this.accumulator = (this.accumulator || 0) + deltaTime;

        while (this.accumulator >= timeStep) {
            this.update(timeStep);
            this.accumulator -= timeStep;
        }

        // Store deltaTime for use in other methods
        this.deltaTime = timeStep;

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
    update(deltaTime) {
        if (this.charge) {
            this.power = Math.min(this.power * 1.05, this.maxPower);
        }

        // Apply gravity and update hand position
        this.hand.applyForce(0, this.gravity * this.hand.mass);
        this.hand.update(this.damping, deltaTime);
        this.limitVelocity(this.hand, 200);

        // Apply gravity and update segments (except the base)
        for (let i = 1; i < this.segments.length; i++) {
            let segment = this.segments[i];
            segment.applyForce(0, this.gravity * segment.mass);
            segment.update(this.damping, deltaTime);
            this.limitVelocity(segment, 200);
        }

        // Apply spring forces
        this.applySpringForces();

        // Enforce constraints
        this.enforceConstraints();
    }

    /**
     * Limit the particle's velocity to a maximum value.
     */
    limitVelocity(particle, maxVelocity) {
        const vx = particle.x - particle.lastX;
        const vy = particle.y - particle.lastY;
        const speed = Math.sqrt(vx * vx + vy * vy);

        if (speed > maxVelocity) {
            const scale = maxVelocity / speed;
            particle.lastX = particle.x - vx * scale;
            particle.lastY = particle.y - vy * scale;
        }
    }

    /**
     * Apply spring forces between connected segments and the hand.
     */
    applySpringForces() {
        const iterations = 5; // Adjusted iterations

        for (let k = 0; k < iterations; k++) {
            for (let spring of this.springs) {
                spring.apply();
            }
        }
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
            if (particle.x < particle.radius) {
                particle.x = particle.radius;
            }
            if (particle.x > this.canvas.width - particle.radius) {
                particle.x = this.canvas.width - particle.radius;
            }
            if (particle.y < particle.radius) {
                particle.y = particle.radius;
            }
            if (particle.y > this.canvas.height - particle.radius) {
                particle.y = this.canvas.height - particle.radius;
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
        for (let spring of this.springs) {
            this.ctx.moveTo(spring.p1.x, spring.p1.y);
            this.ctx.lineTo(spring.p2.x, spring.p2.y);
        }
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
        const vx = ((this.hand.x - this.hand.lastX) / this.deltaTime).toFixed(2);
        const vy = ((this.hand.y - this.hand.lastY) / this.deltaTime).toFixed(2);
        this.ctx.fillText(`Hand Velocity: vx=${vx}, vy=${vy}`, 10, 40);

        // Display power
        this.ctx.fillText(`Power: ${this.power.toFixed(2)}`, 10, 60);

        // Display number of springs
        this.ctx.fillText(`Springs: ${this.springs.length}`, 10, 80);
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

        const maxSpeed = 200; // Increased max speed
        const speedMultiplier = 2; // Adjust as needed
        const speed = Math.min(this.power * speedMultiplier, maxSpeed);
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        // Adjust last positions for Verlet integration
        const deltaTime = this.deltaTime || 0.005; // Default to timeStep if undefined
        this.hand.lastX = this.hand.x - vx * deltaTime;
        this.hand.lastY = this.hand.y - vy * deltaTime;
    }
}

/**
 * Particle class using Verlet integration.
 */
class Particle {
    constructor(x = 0, y = 0, mass = 1) {
        this.x = x;
        this.y = y;

        // Previous position
        this.lastX = x;
        this.lastY = y;

        // Accumulated forces
        this.fx = 0;
        this.fy = 0;

        this.mass = mass;

        this.radius = 5;
    }

    applyForce(fx, fy) {
        this.fx += fx;
        this.fy += fy;
    }

    update(damping, deltaTime) {
        const ax = this.fx / this.mass;
        const ay = this.fy / this.mass;

        const tempX = this.x;
        const tempY = this.y;

        const vx = (this.x - this.lastX) * damping;
        const vy = (this.y - this.lastY) * damping;

        // Verlet integration with time step squared
        this.x += vx + ax * deltaTime * deltaTime;
        this.y += vy + ay * deltaTime * deltaTime;

        this.lastX = tempX;
        this.lastY = tempY;

        // Reset forces
        this.fx = 0;
        this.fy = 0;
    }

    draw(ctx, color = 'yellow') {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

/**
 * Spring class connecting two particles with nonlinear stiffness.
 */
class Spring {
    constructor(p1, p2, restLength, baseStiffness) {
        this.p1 = p1;
        this.p2 = p2;
        this.restLength = restLength;
        this.baseStiffness = baseStiffness;
    }

    apply() {
        const dx = this.p2.x - this.p1.x;
        const dy = this.p2.y - this.p1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance === 0) return;

        const stretch = distance - this.restLength;

        // Nonlinear stiffness adjustment
        let stiffness = this.baseStiffness;
        if (stretch > 0) {
            stiffness += stretch * 0.1; // Increase stiffness with stretch
        }

        const force = (stretch / distance) * stiffness;
        const offsetX = dx * force;
        const offsetY = dy * force;

        // Adjust positions
        this.p1.x += offsetX * 0.5;
        this.p1.y += offsetY * 0.5;
        this.p2.x -= offsetX * 0.5;
        this.p2.y -= offsetY * 0.5;
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
            // Collision detected
            const normalY = dy > 0 ? 1 : -1;

            particle.y = closestY + normalY * particle.radius;

            // Calculate velocity
            const vx = particle.x - particle.lastX;
            const vy = particle.y - particle.lastY;

            // Apply restitution (bounce) and friction
            const restitution = 0.5; // Bounce factor
            const friction = 0.8;    // Friction factor

            particle.lastY = particle.y + vy * restitution;
            particle.lastX = particle.x + vx * friction;
        }
    }

    draw(ctx) {
        ctx.fillStyle = 'gray';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}