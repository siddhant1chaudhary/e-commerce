import React from 'react';
import banner1 from '../utils/images/banner1.png';
import banner2 from '../utils/images/banner2.jpg';
import banner3 from '../utils/images/banner3.jpg';

export default function BannerCarousel() {
  return (
    <div id="homeCarousel" className="carousel slide mb-4" data-bs-ride="carousel">
      <div className="carousel-indicators">
        <button type="button" data-bs-target="#homeCarousel" data-bs-slide-to="0" className="active" aria-current="true" aria-label="Slide 1"></button>
        <button type="button" data-bs-target="#homeCarousel" data-bs-slide-to="1" aria-label="Slide 2"></button>
        <button type="button" data-bs-target="#homeCarousel" data-bs-slide-to="2" aria-label="Slide 3"></button>
      </div>
      <div className="carousel-inner">
        <div className="carousel-item active">
          <img src={banner1?.src || banner1} className="d-block w-100 carousel-hero" alt="banner1" />
        </div>
        <div className="carousel-item">
          <img src={banner2?.src || banner2} className="d-block w-100 carousel-hero" alt="banner2"  />
        </div>
        <div className="carousel-item">
          <img src={banner3?.src || banner3} className="d-block w-100 carousel-hero" alt="banner3" />
        </div>
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
