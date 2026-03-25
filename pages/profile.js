import Header from '../components/Header';
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from '../styles/Profile.module.css';
import { useAuth } from '../components/AuthProvider';
import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { parseCookies, verifyToken } from '../lib/auth';
import { useToast } from '../components/ToastProvider';

const fetcher = (url) => fetch(url, { credentials: 'same-origin' }).then(r => r.json());

export default function Profile({ serverUser }) {
  const { user: clientUser } = useAuth() || {};
  const user = clientUser || serverUser;
  const toast = useToast();

  // Profile (name/email)
  const { data: profileData, error: profileError, mutate: profileMutate } = useSWR('/api/users/profile', fetcher);

  // Addresses (list + CRUD)
  const {
    data: addressesData,
    error: addressesError,
    mutate: addressesMutate
  } = useSWR('/api/users/addresses', fetcher);

  const [editMode, setEditMode] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', email: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  // New address (auto-save)
  const [newAddress, setNewAddress] = useState({ name: '', phone: '', address: '' });
  const [autoSavingNewAddress, setAutoSavingNewAddress] = useState(false);
  const newAddressTimerRef = useRef(null);

  // Existing address editing
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [editAddress, setEditAddress] = useState({ name: '', phone: '', address: '' });

  useEffect(() => {
    if (!profileData) return;
    setProfileForm({
      name: profileData.name || '',
      email: profileData.email || ''
    });
  }, [profileData]);

  const addresses = useMemo(() => {
    const list = addressesData?.addresses;
    if (Array.isArray(list) && list.length) return list;
    // Fallback to profile defaultAddress if addresses API is still empty.
    if (profileData?.defaultAddress) return [profileData.defaultAddress];
    return [];
  }, [addressesData, profileData]);

  const defaultAddress = useMemo(() => {
    return addresses.find(a => a.isDefault) || addresses[0] || null;
  }, [addresses]);

  useEffect(() => {
    if (autoSavingNewAddress) return;
    const name = newAddress.name?.trim() || '';
    const phone = newAddress.phone?.trim() || '';
    const address = newAddress.address?.trim() || '';

    const ready = name && phone && address;
    if (!ready) return;

    if (newAddressTimerRef.current) clearTimeout(newAddressTimerRef.current);

    newAddressTimerRef.current = setTimeout(async () => {
      setAutoSavingNewAddress(true);
      try {
        const res = await fetch('/api/users/addresses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ name, phone, address })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to save address');
        }

        setNewAddress({ name: '', phone: '', address: '' });
        await addressesMutate();
        toast?.show({ type: 'success', message: 'Address saved' });
      } catch (err) {
        toast?.show({ type: 'error', message: err.message || 'Failed to save address' });
      } finally {
        setAutoSavingNewAddress(false);
      }
    }, 900);

    return () => {
      if (newAddressTimerRef.current) clearTimeout(newAddressTimerRef.current);
    };
  }, [newAddress, autoSavingNewAddress, addressesMutate, toast]);

  async function saveProfile(e) {
    e.preventDefault();
    if (!profileForm.name.trim() || !profileForm.email.trim()) return;

    setSavingProfile(true);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          name: profileForm.name,
          email: profileForm.email
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update profile');
      }

      setEditMode(false);
      await profileMutate();
      toast?.show({ type: 'success', message: 'Profile updated' });
    } catch (err) {
      toast?.show({ type: 'error', message: err.message || 'Failed to update profile' });
    } finally {
      setSavingProfile(false);
    }
  }

  function startEditAddress(addr) {
    setEditingAddressId(addr.id);
    setEditAddress({
      name: addr.name || '',
      phone: addr.phone || '',
      address: addr.address || ''
    });
  }

  async function updateAddress() {
    if (!editingAddressId) return;
    const name = editAddress.name?.trim() || '';
    const phone = editAddress.phone?.trim() || '';
    const address = editAddress.address?.trim() || '';

    if (!name || !phone || !address) {
      toast?.show({ type: 'error', message: 'Please fill name, phone and address' });
      return;
    }

    const res = await fetch('/api/users/addresses', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        action: 'update',
        id: editingAddressId,
        name,
        phone,
        address
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast?.show({ type: 'error', message: err.error || 'Failed to update address' });
      return;
    }

    setEditingAddressId(null);
    await addressesMutate();
    toast?.show({ type: 'success', message: 'Address updated' });
  }

  async function setDefaultAddress(addressId) {
    const res = await fetch('/api/users/addresses', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ action: 'set-default', id: addressId })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast?.show({ type: 'error', message: err.error || 'Failed to set default address' });
      return;
    }

    await addressesMutate();
    toast?.show({ type: 'success', message: 'Default address updated' });
  }

  async function deleteAddress(addressId) {
    if (!confirm('Delete this address?')) return;

    const res = await fetch('/api/users/addresses', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ id: addressId })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast?.show({ type: 'error', message: err.error || 'Failed to delete address' });
      return;
    }

    if (editingAddressId === addressId) setEditingAddressId(null);
    await addressesMutate();
    toast?.show({ type: 'success', message: 'Address deleted' });
  }

  if (!user) {
    return (
      <>
        <Header />
        <div className={`container ${styles.profileContainer}`}>
          <h1 className="text-center my-4">My Profile</h1>
          <div className="alert alert-warning">
            Please <Link href="/auth/login" legacyBehavior><a>login</a></Link> to view your profile.
          </div>
        </div>
      </>
    );
  }

  if (profileError || addressesError) {
    return (
      <>
        <Header />
        <div className={`container ${styles.profileContainer}`}>
          <h1 className="text-center my-4">My Profile</h1>
          <div className="alert alert-danger">Failed to load profile</div>
        </div>
      </>
    );
  }

  const name = profileData?.name || '';
  const email = profileData?.email || '';

  return (
    <>
      <Header />
      <div className={`container ${styles.profileContainer}`}>
        <h1 className="text-center my-4">My Profile</h1>

        <div className="row g-4">
          <div className="col-12 col-lg-5">
            <div className="card mx-auto" style={{ maxWidth: 600 }}>
              <div className="card-body">
                {!editMode ? (
                  <>
                    <h5 className="card-title">{name || 'User'}</h5>
                    <p className="card-text">Email: {email}</p>
                    <p className="card-text">
                      Default Address: {defaultAddress?.address ? defaultAddress.address : '-'}
                    </p>
                    <button className="btn btn-primary" onClick={() => setEditMode(true)}>
                      Edit Profile
                    </button>
                  </>
                ) : (
                  <form onSubmit={saveProfile}>
                    <div className="mb-3">
                      <label className="form-label small text-muted">Name</label>
                      <input
                        className="form-control"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label small text-muted">Email</label>
                      <input
                        className="form-control"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                        type="email"
                        required
                      />
                    </div>
                    <div className="d-flex gap-2">
                      <button className="btn btn-primary" disabled={savingProfile} type="submit">
                        {savingProfile ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        className="btn btn-outline-secondary"
                        type="button"
                        disabled={savingProfile}
                        onClick={() => setEditMode(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-7">
            <div className="card">
              <div className="card-body">
                <h5 className="card-title mb-3">Addresses</h5>

                {addresses.length === 0 ? (
                  <div className="text-muted">No addresses yet.</div>
                ) : (
                  <div className="row g-3 mb-3">
                    {addresses.map((addr) => {
                      const isDefault = !!addr.isDefault;
                      const isEditing = editingAddressId === addr.id;

                      return (
                        <div key={addr.id} className="col-12">
                          <div className="card shadow-sm">
                            <div className="card-body">
                              <div className="d-flex justify-content-between align-items-start">
                                <div>
                                  <div className="fw-semibold">{addr.name || 'Address'}</div>
                                  <div className="small text-muted">{addr.phone || ''}</div>
                                  <div className="mt-2">{addr.address || '-'}</div>
                                  {isDefault && <span className="badge bg-success mt-2">Default</span>}
                                </div>
                                <div className="text-end">
                                  {!isEditing ? (
                                    <>
                                      <button
                                        className="btn btn-sm btn-outline-primary me-2"
                                        onClick={() => startEditAddress(addr)}
                                      >
                                        Edit
                                      </button>
                                      {!isDefault && (
                                        <button
                                          className="btn btn-sm btn-outline-secondary me-2"
                                          onClick={() => setDefaultAddress(addr.id)}
                                        >
                                          Set Default
                                        </button>
                                      )}
                                      <button
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={() => deleteAddress(addr.id)}
                                      >
                                        Delete
                                      </button>
                                    </>
                                  ) : (
                                    <div>
                                      <div className="mb-2">
                                        <input
                                          className="form-control form-control-sm"
                                          value={editAddress.name}
                                          onChange={(e) => setEditAddress({ ...editAddress, name: e.target.value })}
                                          placeholder="Address Name"
                                        />
                                      </div>
                                      <div className="mb-2">
                                        <input
                                          className="form-control form-control-sm"
                                          value={editAddress.phone}
                                          onChange={(e) => setEditAddress({ ...editAddress, phone: e.target.value })}
                                          placeholder="Phone"
                                        />
                                      </div>
                                      <div className="mb-2">
                                        <textarea
                                          className="form-control form-control-sm"
                                          value={editAddress.address}
                                          onChange={(e) => setEditAddress({ ...editAddress, address: e.target.value })}
                                          placeholder="Address"
                                          rows={2}
                                        />
                                      </div>
                                      <div className="d-flex gap-2 justify-content-end">
                                        <button className="btn btn-sm btn-primary" type="button" onClick={updateAddress}>
                                          Update
                                        </button>
                                        <button
                                          className="btn btn-sm btn-outline-secondary"
                                          type="button"
                                          onClick={() => setEditingAddressId(null)}
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <h6 className="mt-4 mb-3">Add New Address (Auto-save)</h6>
                <div className="card shadow-sm">
                  <div className="card-body">
                    <div className="row g-3">
                      <div className="col-12 col-md-4">
                        <input
                          className="form-control"
                          value={newAddress.name}
                          onChange={(e) => setNewAddress({ ...newAddress, name: e.target.value })}
                          placeholder="Address Name"
                        />
                      </div>
                      <div className="col-12 col-md-3">
                        <input
                          className="form-control"
                          value={newAddress.phone}
                          onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                          placeholder="Phone"
                        />
                      </div>
                      <div className="col-12 col-md-5">
                        <input
                          className="form-control"
                          value={newAddress.address}
                          onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })}
                          placeholder="Address"
                        />
                      </div>
                    </div>

                    <div className="small text-muted mt-2">
                      {autoSavingNewAddress ? 'Saving...' : 'When all fields are filled, the address will be saved automatically.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export async function getServerSideProps({ req }) {
  const cookies = parseCookies(req);
  const token = cookies['token'];
  const payload = token ? verifyToken(token) : null;

  if (!payload) {
    return {
      redirect: {
        destination: '/auth/login',
        permanent: false
      }
    };
  }

  return { props: { serverUser: { id: payload.sub, role: payload.role } } };
}
