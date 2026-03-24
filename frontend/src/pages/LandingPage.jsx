import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import './LandingPage.css';

const LandingPage = () => {
    const heroRef = useRef(null);
    const featuresRef = useRef(null);

    useEffect(() => {
        // Simple entry animations
        const tl = gsap.timeline();

        tl.from(heroRef.current.children, {
            y: 50,
            opacity: 0,
            duration: 0.8,
            stagger: 0.2,
            ease: "power3.out"
        });

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    gsap.fromTo(entry.target.children,
                        {
                            y: 50,
                            opacity: 0
                        },
                        {
                            y: 0,
                            opacity: 1,
                            duration: 0.8,
                            stagger: 0.2,
                            ease: "power3.out"
                        }
                    );
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        if (featuresRef.current) {
            observer.observe(featuresRef.current);
        }

        return () => observer.disconnect();
    }, []);

    return (
        <div className="landing-page">
            {/* Navbar (simplified for landing) */}
            <nav className="navbar">
                <div className="logo">
                    <span className="logo-icon">🌱</span>
                    <span className="logo-text">FarmWise</span>
                </div>
                <div className="menu">
                    <Link to="/signin" className="btn-secondary-lg">Sign In</Link>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="landing-hero">
                {/* Decorative floating elements */}


                <div className="hero-content" ref={heroRef}>
                    <h1 className="hero-title hero-title-gradient">The Future of <br />Smart Farming</h1>
                    <p className="hero-subtitle">
                        Empowering farmers with AI-driven insights for Soil Analysis, Crop Health, and Smart Planning.
                    </p>
                    <div className="hero-buttons">
                        <Link to="/signup" className="btn-primary-lg">
                            <span className="btn-front">Get Started</span>
                            <span className="btn-back">Let's Go! 🚀</span>
                        </Link>
                        <a href="#features" className="btn-learn-more">
                            <span className="circle" aria-hidden="true">
                                <span className="icon arrow"></span>
                            </span>
                            <span className="button-text">Learn More</span>
                        </a>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="features-section">
                <div className="section-header">
                    <h2>Everything You Need</h2>
                    <p style={{ color: '#666', fontSize: '1.2rem' }}>A complete ecosystem for modern agriculture</p>
                </div>

                <div className="features-grid" ref={featuresRef}>
                    <div className="feature-card soil">
                        <div className="feature-icon soil-icon">🌍</div>
                        <h3 className="feature-title">Soil Analysis</h3>
                        <p className="feature-desc">Instantly analyze soil health, pH levels, and nutrient composition using AI-driven image processing. Get accurate data to optimize your fertilizer usage.</p>
                    </div>

                    <div className="feature-card crop">
                        <div className="feature-icon crop-icon">🌿</div>
                        <h3 className="feature-title">Crop Analysis</h3>
                        <p className="feature-desc">Detect diseases early with our AI scanner. Simply upload a photo of your crop to receive immediate diagnosis and treatment recommendations.</p>
                    </div>

                    <div className="feature-card advisor">
                        <div className="feature-icon advisor-icon">🤖</div>
                        <h3 className="feature-title">Advisor Chatbot</h3>
                        <p className="feature-desc">Your 24/7 agricultural expert. Ask questions about farming techniques, government schemes, or pest control and get instant, reliable answers.</p>
                    </div>

                    <div className="feature-card planner">
                        <div className="feature-icon planner-icon">📅</div>
                        <h3 className="feature-title">Smart Planner</h3>
                        <p className="feature-desc">Plan your planting schedule strategically. Our planner analyzes seasonal trends and weather forecasts to suggest the best times for sowing and harvesting.</p>
                    </div>

                    <div className="feature-card reminder">
                        <div className="feature-icon reminder-icon">🔔</div>
                        <h3 className="feature-title">Smart Reminders</h3>
                        <p className="feature-desc">Never miss a critical farming task. Set automated alerts for irrigation, fertilization, and harvest cycles to keep your farm running smoothly.</p>
                    </div>
                </div>

            </section>
        </div>
    );
};

export default LandingPage;
