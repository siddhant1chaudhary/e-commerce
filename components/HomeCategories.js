import Link from 'next/link';
import newBornImg from '../utils/images/newborn.png';
import infantsImg from '../utils/images/Infants.png';
import toddlerImg from '../utils/images/Toddler.png';
import juniorsImg from '../utils/images/juniors.png';

const categories = [
  { id: 'newborn', title: 'New born', img: newBornImg?.src || newBornImg },
  { id: 'infants', title: 'Infants', img: infantsImg?.src || infantsImg },
  { id: 'toddler', title: 'Toddler', img: toddlerImg?.src || toddlerImg },
  { id: 'juniors', title: 'Juniors', img: juniorsImg?.src || juniorsImg },
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
              <a className="card rounded-circle category-card text-decoration-none text-dark " style={{height:"175px" ,width:"220px"}}>
                <img src={c.img} width="100px" height="100px"  alt={c.title} className="card-img-top rounded-circle category-img" onError={(e)=>{e.currentTarget.src='/images/placeholder.png'}} />
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
