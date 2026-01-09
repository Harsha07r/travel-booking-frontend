import React, { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './BookingModal.css';

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

  useEffect(() => {
    if (!tourId || !date) return;

    const fetchAvailability = async () => {
      setChecking(true);
      setError(null);
      try {
        const day = date.toISOString().slice(0, 10);
        const res = await fetch(
          `/api/bookings/availability/${tourId}?date=${day}&capacity=${totalCapacity}`
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Availability check failed');
        setBookedCount(json.bookedCount || 0);
      } catch (e) {
        setError(e.message);
      } finally {
        setChecking(false);
      }
    };

    fetchAvailability();
  }, [date, tourId, totalCapacity]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    /* ---------- FIELD VALIDATION (NO GENERIC ERROR) ---------- */

    if (!name.trim()) {
      setError('Please enter your full name');
      setSubmitting(false);
      return;
    }

    if (!email.trim()) {
      setError('Please enter your email address');
      setSubmitting(false);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      setSubmitting(false);
      return;
    }

    if (!phone.trim()) {
      setError('Please enter your phone number');
      setSubmitting(false);
      return;
    }

    if (!date || isNaN(new Date(date).getTime())) {
      setError('Please select a valid travel date');
      setSubmitting(false);
      return;
    }

    if (persons < 1) {
      setError('Number of people must be at least 1');
      setSubmitting(false);
      return;
    }

    /* ---------- AVAILABILITY VALIDATION ---------- */

    if (availableSpots <= 0) {
      setError('No spots available for the selected date');
      setSubmitting(false);
      return;
    }

    if (persons > availableSpots) {
      setError(`Only ${availableSpots} spot(s) available on this date`);
      setSubmitting(false);
      return;
    }

    /* ---------- SUBMIT ---------- */

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

      const res = await fetch('/api/bookings/create', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Booking failed');

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
          <div className="form-group">
            <label>Travel Date</label>
            <DatePicker
              selected={date}
              onChange={setDate}
              minDate={new Date()}
              dateFormat="yyyy-MM-dd"
              className="form-control"
              placeholderText="Select date"
            />
            {checking && <small>Checking availability...</small>}
            {date && !checking && (
              <small style={{ color: availableSpots > 0 ? 'green' : 'red' }}>
                {availableSpots > 0
                  ? `${availableSpots}/${totalCapacity} spots available`
                  : 'No spots available'}
              </small>
            )}
          </div>

          <div className="form-group">
            <label>Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>People</label>
              <input
                type="number"
                min={1}
                max={20}
                value={persons}
                onChange={e => setPersons(Number(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label>Accommodation</label>
              <select
                value={accommodationType}
                onChange={e => setAccommodationType(e.target.value)}
              >
                <option>Standard</option>
                <option>Deluxe</option>
                <option>Premium</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Other Requirements</label>
            <textarea
              value={otherRequirements}
              onChange={e => setOtherRequirements(e.target.value)}
              maxLength={500}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            className="submit-btn"
            type="submit"
            disabled={submitting || availableSpots <= 0 || persons > availableSpots}
          >
            {submitting
              ? 'Booking...'
              : availableSpots <= 0
              ? 'Sold Out'
              : 'Book Now'}
          </button>
        </form>
      </div>
    </div>
  );
}
