import React from 'react';

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
          <img src="https://as1.ftcdn.net/v2/jpg/03/20/68/66/1000_F_320686681_Ur6vdYQgDC9WiijiVfxlRyQffxOgfeFz.jpg" className="d-block w-100 carousel-hero" alt="banner1" />
        </div>
        <div className="carousel-item">
          <img src="https://as2.ftcdn.net/v2/jpg/02/83/68/41/1000_F_283684148_VUiF5Ei9Uca6ResgLzeORpIu6vF1xsHJ.jpg" className="d-block w-100 carousel-hero" alt="banner2"  />
        </div>
        <div className="carousel-item">
          <img src="https://as1.ftcdn.net/v2/jpg/02/11/28/00/1000_F_211280049_g8nsjnEXE2383rW14OQ64Rg2WPANojKK.jpg" className="d-block w-100 carousel-hero" alt="banner3" />
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
