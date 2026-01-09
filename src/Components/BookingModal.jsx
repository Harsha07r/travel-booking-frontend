import React, { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './BookingModal.css';

/* ✅ PRODUCTION-SAFE API BASE */
const API = import.meta.env.VITE_API_URL;

export default function BookingModal({
  isOpen,
  onClose,
  tourId,
  tourName,
  authToken,
  onBooked,
  capacity = 3
}) {
  const [date, setDate] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [persons, setPersons] = useState(1);
  const [accommodationType, setAccommodationType] = useState('Standard');
  const [otherRequirements, setOtherRequirements] = useState('');
  const [bookedCount, setBookedCount] = useState(0);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const totalCapacity = capacity;
  const availableSpots = totalCapacity - bookedCount;

  useEffect(() => {
    if (!isOpen) {
      setDate(null);
      setBookedCount(0);
      setError(null);
    }
  }, [isOpen]);

  /* ✅ AVAILABILITY CHECK (FIXED URL) */
  useEffect(() => {
    if (!tourId || !date) return;

    const fetchAvailability = async () => {
      setChecking(true);
      setError(null);

      try {
        const day = date.toISOString().slice(0, 10);
        const res = await fetch(
          `${API}/api/bookings/availability/${tourId}?date=${day}&capacity=${totalCapacity}`
        );

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || 'Availability check failed');
        }

        const json = await res.json();
        setBookedCount(json.bookedCount || 0);
      } catch (e) {
        setError(e.message);
      } finally {
        setChecking(false);
      }
    };

    fetchAvailability();
  }, [date, tourId, totalCapacity]);

  /* ✅ BOOKING SUBMIT (FIXED URL) */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    /* -------- VALIDATION -------- */
    if (!name.trim()) return fail('Please enter your full name');
    if (!email.trim()) return fail('Please enter your email address');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Invalid email');
    if (!phone.trim()) return fail('Please enter your phone number');
    if (!date) return fail('Please select a travel date');
    if (persons < 1) return fail('At least 1 person required');
    if (availableSpots <= 0) return fail('No spots available');
    if (persons > availableSpots)
      return fail(`Only ${availableSpots} spot(s) available`);

    function fail(msg) {
      setError(msg);
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        tourId,
        tourName,
        fullName: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        travelDate: date.toISOString().slice(0, 10),
        numberOfPeople: persons,
        accommodationType,
        otherRequirements: otherRequirements.trim()
      };

      const headers = { 'Content-Type': 'application/json' };
      if (authToken) headers.Authorization = `Bearer ${authToken}`;

      const res = await fetch(`${API}/api/bookings/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Booking failed');
      }

      const json = await res.json();
      onBooked?.(json.booking);
      alert('Booking successful!');
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-btn" onClick={onClose}>×</button>

        <h2>Book Your Trip</h2>
        <p className="tour-name">{tourName}</p>

        <form onSubmit={handleSubmit}>
          <label>Travel Date</label>
          <DatePicker
            selected={date}
            onChange={setDate}
            minDate={new Date()}
            dateFormat="yyyy-MM-dd"
            className="form-control"
          />

          <input placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} />
          <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} />

          <input
            type="number"
            min={1}
            value={persons}
            onChange={e => setPersons(Number(e.target.value))}
          />

          <select value={accommodationType} onChange={e => setAccommodationType(e.target.value)}>
            <option>Standard</option>
            <option>Deluxe</option>
            <option>Premium</option>
          </select>

          <textarea
            placeholder="Other Requirements"
            value={otherRequirements}
            onChange={e => setOtherRequirements(e.target.value)}
          />

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={submitting}>
            {submitting ? 'Booking...' : 'Book Now'}
          </button>
        </form>
      </div>
    </div>
  );
}
