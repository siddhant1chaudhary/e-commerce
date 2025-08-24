import Link from 'next/link';

const categories = [
  { id: 'men', title: 'Men', img: 'https://www.keyideasinfotech.com/wp-content/uploads/2025/03/mens-fashion-website-design-california.webp' },
  { id: 'women', title: 'Women', img: 'https://www.shutterstock.com/shutterstock/photos/2157666173/display_1500/stock-photo-mobile-shopping-couple-of-buyers-using-phone-and-credit-card-purchasing-new-clothes-in-application-2157666173.jpg' },
  { id: 'kids', title: 'Kids', img: 'https://voilastudio.in/old_website_assets/voilastudio_admin/images/kids_style_ecomm/K_TSHIRT_STYLE16_03_23%20(3).webp' },
  { id: 'home', title: 'Home', img: 'https://www.shutterstock.com/shutterstock/photos/2157666173/display_1500/stock-photo-mobile-shopping-couple-of-buyers-using-phone-and-credit-card-purchasing-new-clothes-in-application-2157666173.jpg' }
];

export default function HomeCategories() {
  return (
    <section className="mb-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Shop by category</h5>
        <Link href="/" legacyBehavior><a className="small text-muted">View all</a></Link>
      </div>
      <div className="row g-3">
        {categories.map(c => (
          <div key={c.id} className="col-6 col-sm-3">
            <Link href="/" legacyBehavior>
              <a className="card category-card text-decoration-none text-dark h-100">
                <img src={c.img} alt={c.title} className="card-img-top category-img" onError={(e)=>{e.currentTarget.src='/images/placeholder.png'}} />
                <div className="card-body py-2 text-center">
                  <div className="fw-semibold">{c.title}</div>
                </div>
              </a>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
