import React, { useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import Steps from './components/Steps';
import FAQ from './components/FAQ';
import Footer from './components/Footer';

const App: React.FC = () => {
  useEffect(() => {
    // ==========================================================================
    // DYNAMIC CYBERPUNK AMBIENT CANVAS ENGINE
    // ==========================================================================
    const canvas = document.getElementById('ambient-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // 1. Cherry Blossom (Sakura) Petals
    const petals: Petal[] = [];
    const maxPetals = 25;

    class Petal {
      x!: number;
      y!: number;
      size!: number;
      speedX!: number;
      speedY!: number;
      angle!: number;
      angularSpeed!: number;
      sway!: number;
      swaySpeed!: number;
      opacity!: number;

      constructor() {
        this.reset();
        this.y = Math.random() * height; // Start at random height initially
      }

      reset() {
        this.x = Math.random() * width * 0.8;
        this.y = -20;
        this.size = Math.random() * 8 + 6;
        this.speedX = Math.random() * 1.5 + 0.5;
        this.speedY = Math.random() * 1.5 + 1.0;
        this.angle = Math.random() * Math.PI * 2;
        this.angularSpeed = Math.random() * 0.02 - 0.01;
        this.sway = 0;
        this.swaySpeed = Math.random() * 0.02 + 0.01;
        this.opacity = Math.random() * 0.5 + 0.4;
      }

      update() {
        this.y += this.speedY;
        this.sway += this.swaySpeed;
        this.x += this.speedX + Math.sin(this.sway) * 0.5;
        this.angle += this.angularSpeed;
        if (this.y > height + 20 || this.x > width + 20) {
          this.reset();
        }
      }

      draw() {
        if (!ctx) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size, this.size / 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 105, 180, ${this.opacity})`;
        ctx.shadowColor = 'rgba(255, 0, 127, 0.4)';
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.restore();
      }
    }

    for (let i = 0; i < maxPetals; i++) {
      petals.push(new Petal());
    }

    // 2. Rising Cyber Embers / Glowing Particles
    const embers: Ember[] = [];
    const maxEmbers = 40;

    class Ember {
      x!: number;
      y!: number;
      size!: number;
      speedX!: number;
      speedY!: number;
      opacity!: number;
      color!: string;

      constructor() {
        this.reset();
        this.y = Math.random() * height;
      }

      reset() {
        this.x = Math.random() * width;
        this.y = height + Math.random() * 50 + 10;
        this.size = Math.random() * 3 + 1;
        this.speedX = Math.random() * 0.8 - 0.4;
        this.speedY = -(Math.random() * 1.2 + 0.6);
        this.opacity = Math.random() * 0.7 + 0.3;
        this.color = Math.random() > 0.5 ? 'rgba(0, 240, 255,' : 'rgba(255, 0, 127,'; // Cyan or Pink
      }

      update() {
        this.y += this.speedY;
        this.x += this.speedX;
        if (this.y < -10 || this.opacity <= 0) {
          this.reset();
        }
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `${this.color}${this.opacity})`;
        ctx.shadowColor = this.color.includes('255, 0, 127') ? '#ff007f' : '#00f0ff';
        ctx.shadowBlur = 8;
        ctx.fill();
      }
    }

    for (let i = 0; i < maxEmbers; i++) {
      embers.push(new Ember());
    }

    // 3. Shooting Stars
    const shootingStars: ShootingStar[] = [];

    class ShootingStar {
      x!: number;
      y!: number;
      len!: number;
      speed!: number;
      angle!: number;
      active!: boolean;
      timer!: number;

      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * width * 0.5;
        this.y = Math.random() * height * 0.3;
        this.len = Math.random() * 80 + 50;
        this.speed = Math.random() * 10 + 8;
        this.angle = Math.PI / 6; // Drifts 30 degrees down-right
        this.active = false;
        this.timer = Math.random() * 300 + 100;
      }

      update() {
        if (!this.active) {
          this.timer--;
          if (this.timer <= 0) {
            this.active = true;
          }
          return;
        }
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        if (this.x > width + this.len || this.y > height + this.len) {
          this.reset();
        }
      }

      draw() {
        if (!ctx || !this.active) return;
        ctx.save();
        ctx.beginPath();
        const grad = ctx.createLinearGradient(
          this.x,
          this.y,
          this.x - Math.cos(this.angle) * this.len,
          this.y - Math.sin(this.angle) * this.len
        );
        grad.addColorStop(0, 'rgba(0, 240, 255, 0.8)');
        grad.addColorStop(0.5, 'rgba(157, 0, 255, 0.4)');
        grad.addColorStop(1, 'rgba(255, 0, 127, 0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 10;
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(
          this.x - Math.cos(this.angle) * this.len,
          this.y - Math.sin(this.angle) * this.len
        );
        ctx.stroke();
        ctx.restore();
      }
    }

    for (let i = 0; i < 2; i++) {
      shootingStars.push(new ShootingStar());
    }

    // Animation loop flag
    let animationId: number;

    const animate = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      // Embers
      ctx.shadowBlur = 0;
      for (const ember of embers) {
        ember.update();
        ember.draw();
      }

      // Petals
      for (const petal of petals) {
        petal.update();
        petal.draw();
      }

      // Shooting stars
      for (const star of shootingStars) {
        star.update();
        star.draw();
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    // ==========================================================================
    // SMOOTH PARALLAX SCROLLING EFFECT
    // ==========================================================================
    const handleParallax = () => {
      const scrolled = window.pageYOffset;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const spaceGradient = document.querySelector('.space-gradient') as HTMLElement | null;
      if (spaceGradient && maxScroll > 0) {
        const scrollPercent = scrolled / maxScroll;
        const translateVal = scrollPercent * 15;
        spaceGradient.style.transform = `translateY(-${translateVal}vh)`;
      }
    };

    window.addEventListener('scroll', handleParallax);
    window.addEventListener('resize', handleParallax);
    handleParallax(); // Initial run

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleParallax);
      window.removeEventListener('resize', handleParallax);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-transparent flex flex-col font-sans text-slate-200 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Immersive fixed background container */}
      <div className="space-background">
        <div className="space-gradient"></div>
        <canvas id="ambient-canvas"></canvas>
      </div>

      <Navbar />
      <main className="flex-grow relative z-10">
        <Hero />
        <Features />
        <Steps />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
};

export default App;