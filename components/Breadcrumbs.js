import Link from 'next/link';
import { useRouter } from 'next/router';

function niceLabel(seg) {
	// numeric or long hex -> treat as "Details"
	if (!seg) return '';
	if (/^[0-9]+$/.test(seg)) return 'Details';
	if (/^[0-9a-fA-F]{8,}$/.test(seg)) return 'Details';
	// simple transform: replace dashes and title-case
	return seg.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Breadcrumbs() {
	const router = useRouter();
	// remove query/hash
	const path = (router.asPath || '').split('?')[0].split('#')[0];
	const parts = path.split('/').filter(Boolean);

	// don't show breadcrumbs on home page
	if (parts.length === 0) return null;

	const items = [];
	let accum = '';
	items.push({ href: '/', label: 'Home' });

	parts.forEach((p, idx) => {
		// Skip "Auth" segment for login and signup pages
		if (p.toLowerCase() === 'auth' && (parts[idx + 1]?.toLowerCase() === 'login' || parts[idx + 1]?.toLowerCase() === 'signup')) {
			return;
		}

		accum += `/${p}`;
		const isLast = idx === parts.length - 1;
		// If route pattern includes [id], show generic label
		const routePath = router.pathname || '';
		let label = niceLabel(p);
		// handle common dynamic page patterns (product/[id], order/[id], admin pages)
		if (routePath.includes('[id]') && isLast) {
			// try to infer a better label from parent path
			const parent = parts[idx - 1] || '';
			if (/^product(s)?$/i.test(parent)) label = 'Product Details';
			else if (/^order(s)?$/i.test(parent)) label = 'Order Details';
			else label = 'Details';
		}
		items.push({ href: accum, label, active: isLast });
	});

	return (
		<nav aria-label="breadcrumb" className="container">
			<ol className="breadcrumb mb-3">
				{items.map((it, i) => (
					<li key={i} className={`breadcrumb-item ${it.active ? 'active' : ''}`} aria-current={it.active ? 'page' : undefined}>
						{it.active ? (
							it.label
						) : (
							<Link href={it.href} legacyBehavior><a className="text-decoration-none">{it.label}</a></Link>
						)}
					</li>
				))}
			</ol>
		</nav>
	);
}
