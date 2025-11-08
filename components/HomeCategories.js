import Link from 'next/link';
import newBornImg from '../utils/images/newborn.png';
import infantsImg from '../utils/images/Infants.png';
import toddlerImg from '../utils/images/Toddler.png';
import juniorsImg from '../utils/images/juniors.png';

const categories = [
  { id: 'newborn', title: 'New born', img: newBornImg?.src || newBornImg, age:"0-6 Months"},
  { id: 'infants', title: 'Infants', img: infantsImg?.src || infantsImg, age:"6-24 Months"},
  { id: 'toddler', title: 'Toddler', img: toddlerImg?.src || toddlerImg, age:"2-7 Years"},
  { id: 'juniors', title: 'Juniors', img: juniorsImg?.src || juniorsImg, age:"7-10 Years"},
];

export default function HomeCategories() {
  return (
    <section className="mb-4">
      <div style={{color:"#ef806f"}} className="d-flex justify-content-center align-items-center mb-3">
        <h4 className="mb-0">Shop by Age</h4>
      </div>
      <div style={{color:"#ef806f"}} className="d-flex justify-content-end align-items-center mb-3">
        <Link href="/" legacyBehavior><a className="small text-muted">View all</a></Link>
      </div>
      <div className="row g-3">
        {categories.map(c => (
          <div key={c.id} className="col-6 col-sm-3">
            <Link href="/" legacyBehavior>
              <a className="card rounded-circle category-card text-decoration-none text-dark " style={{height:"12.2rem" ,width:"12.2rem"}}>
                <img src={c.img} width="110px" height="110px"  alt={c.title} className="card-img-top rounded-circle category-img" onError={(e)=>{e.currentTarget.src='/images/placeholder.png'}} />
                <div className="card-body py-2 text-center">
                  <div className="fw-semibold">
                    <p style={{fontSize:'1rem', marginBottom:0}}>{c.title}</p>
                    <p style={{fontSize:'0.7rem', marginBottom:0, color:'#666'}}>{c.age}</p>
                  </div>
                </div>
              </a>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
