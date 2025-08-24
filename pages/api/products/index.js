import { getProducts, upsertItem } from '../../../lib/store';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const products = await getProducts();
      res.status(200).json(products);
      return;
    }

    if (req.method === 'POST') {
      const newProduct = {
        id: Date.now().toString(),
        title: req.body.title || 'Untitled',
        price: Number(req.body.price) || 0,
        description: req.body.description || '',
        image: req.body.image || '/images/placeholder.png'
      };
      await upsertItem('products', newProduct);
      res.status(201).json(newProduct);
      return;
    }

    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err) {
    console.error('products API error:', err);
    res.status(500).json({ error: 'Internal server error' });
  
    products.unshift(newProduct);
    await writeData(products);
    res.status(201).json(newProduct);
    return;
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
