import React from 'react';

const BANNERS = [
  { src: '/marketing/banner1.png', alt: 'banner1' },
  { src: '/marketing/banner2.jpg', alt: 'banner2' },
  { src: '/marketing/banner3.jpg', alt: 'banner3' },
];

export default function BannerCarousel() {
  return (
    <div id="homeCarousel" className="carousel slide mb-4" data-bs-ride="carousel">
      <div className="carousel-indicators">
        <button type="button" data-bs-target="#homeCarousel" data-bs-slide-to="0" className="active" aria-current="true" aria-label="Slide 1"></button>
        <button type="button" data-bs-target="#homeCarousel" data-bs-slide-to="1" aria-label="Slide 2"></button>
        <button type="button" data-bs-target="#homeCarousel" data-bs-slide-to="2" aria-label="Slide 3"></button>
      </div>
      <div className="carousel-inner">
        {BANNERS.map((b, i) => (
          <div key={b.src} className={`carousel-item${i === 0 ? ' active' : ''}`}>
            <img src={b.src} className="d-block w-100 carousel-hero" alt={b.alt} />
          </div>
        ))}
      </div>
      <button className="carousel-control-prev" type="button" data-bs-target="#homeCarousel" data-bs-slide="prev">
        <span className="carousel-control-prev-icon" aria-hidden="true"></span>
        <span className="visually-hidden">Previous</span>
      </button>
      <button className="carousel-control-next" type="button" data-bs-target="#homeCarousel" data-bs-slide="next">
        <span className="carousel-control-next-icon" aria-hidden="true"></span>
        <span className="visually-hidden">Next</span>
      </button>
    </div>
  );
}
