'use client'

import { useState } from 'react';

const Home = () => {
  const [formData, setFormData] = useState({
    S: 100.00,
    K: 100.00,
    T: 1.00,
    r: 0.05,
    sigma: 0.20,
  });

  const [result, setResult] = useState<{ call_price: number; put_price: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: parseFloat(value),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://127.0.0.1:8000/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to fetch data');
      const data = await res.json();
      setResult(data);  // Update result to include both call and put prices
    } catch (err) {
      setError('Failed to calculate the option prices. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Black-Scholes Option Pricing</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Stock Price (S):</label>
          <input
            type="number"
            name="S"
            value={formData.S.toFixed(2)}
            onChange={handleChange}
            className="mt-1 block w-full p-2 border text-black border-gray-300 rounded-md"
            required
            step="0.01"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Strike Price (K):</label>
          <input
            type="number"
            name="K"
            value={formData.K.toFixed(2)}
            onChange={handleChange}
            className="mt-1 block w-full p-2 border text-black border-gray-300 rounded-md"
            required
            step="0.01"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Time to Maturity (T) in years:</label>
          <input
            type="number"
            step="0.01"
            name="T"
            value={formData.T.toFixed(2)}
            onChange={handleChange}
            className="mt-1 block w-full p-2 border text-black border-gray-300 rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Risk-free Interest Rate (r):</label>
          <input
            type="number"
            step="0.01"
            name="r"
            value={formData.r.toFixed(2)}
            onChange={handleChange}
            className="mt-1 block w-full p-2 border text-black border-gray-300 rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Volatility (sigma):</label>
          <input
            type="number"
            step="0.01"
            name="sigma"
            value={formData.sigma.toFixed(2)}
            onChange={handleChange}
            className="mt-1 block w-full p-2 border text-black border-gray-300 rounded-md"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full py-2 px-4 bg-blue-500 text-black text-white font-semibold rounded-md hover:bg-blue-600"
          disabled={loading}
        >
          {loading ? 'Calculating...' : 'Calculate'}
        </button>
      </form>
      {error && <p className="mt-4 text-red-500">{error}</p>}
      {result && (
        <div className="mt-4 p-4 border border-gray-300 rounded-md">
          <h2 className="text-lg font-bold">Option Prices</h2>
          <p>Call Price: ${result.call_price.toFixed(2)}</p>
          <p>Put Price: ${result.put_price.toFixed(2)}</p>
        </div>
      )}
    </div>
  );
};

export default Home;