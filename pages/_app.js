import React from 'react';
import '../styles/globals.scss';
import '../styles/printTags.css';
import '../styles/orderPrint.css';
import ToastProvider from '../components/ToastProvider';
import AuthProvider from '../components/AuthProvider';
import GuestVisitorTracker from '../components/GuestVisitorTracker';
import Footer from '../components/Footer';

export default function App({ Component, pageProps }) {
	return (
		<ToastProvider>
			<AuthProvider>
				<GuestVisitorTracker />
				<Component {...pageProps} />
				<Footer />
			</AuthProvider>
		</ToastProvider>
	);
}
