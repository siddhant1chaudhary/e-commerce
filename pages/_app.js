import React from 'react';
import '../styles/globals.scss';
import ToastProvider from '../components/ToastProvider';
import AuthProvider from '../components/AuthProvider';
import Footer from '../components/Footer';

export default function App({ Component, pageProps }) {
	return (
		<ToastProvider>
			<AuthProvider>
				<Component {...pageProps} />
				<Footer />
			</AuthProvider>
		</ToastProvider>
	);
}
