'use client'

import { useState } from 'react';
import React from 'react';
import Plot from 'react-plotly.js';

export default function Home() {
  const [currentPrice, setCurrentPrice] = useState(100);
  const [strike, setStrike] = useState(100);
  const [timeToMaturity, setTimeToMaturity] = useState(1);
  const [volatility, setVolatility] = useState(0.2);
  const [interestRate, setInterestRate] = useState(0.05);
  const [callPrice, setCallPrice] = useState(null);
  const [putPrice, setPutPrice] = useState(null);
  const [heatmapData, setHeatmapData] = useState({ call: [], put: [] });

  const calculate = async () => {
    const response = await fetch('http://127.0.0.1:5000/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        time_to_maturity: timeToMaturity,
        strike: strike,
        current_price: currentPrice,
        volatility: volatility,
        interest_rate: interestRate
      }),
    });

    const data = await response.json();
    setCallPrice(data.call_price);
    setPutPrice(data.put_price);

    // Generate heatmap data
    const spotRange = Array.from({ length: 10 }, (_, i) => currentPrice * (0.8 + i * 0.04));
    const volRange = Array.from({ length: 10 }, (_, i) => volatility * (0.5 + i * 0.1));

    const callPrices = [];
    const putPrices = [];
    
    volRange.forEach((vol) => {
      const rowCall = [];
      const rowPut = [];
      spotRange.forEach((spot) => {
        const response = fetch('http://127.0.0.1:5000/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            time_to_maturity: timeToMaturity,
            strike: strike,
            current_price: spot,
            volatility: vol,
            interest_rate: interestRate
          }),
        });
        const data = response.json();
        rowCall.push(data.call_price);
        rowPut.push(data.put_price);
      });
      callPrices.push(rowCall);
      putPrices.push(rowPut);
    });

    setHeatmapData({
      call: {
        z: callPrices,
        x: spotRange,
        y: volRange,
        type: 'heatmap',
        colorscale: 'Viridis'
      },
      put: {
        z: putPrices,
        x: spotRange,
        y: volRange,
        type: 'heatmap',
        colorscale: 'Viridis'
      }
    });
  };

  return (
    <div>
      <h1>Black-Scholes Pricing Model</h1>
      <aside>
        <h2>Parameters</h2>
        <label>
          Current Asset Price:
          <input type="number" value={currentPrice} onChange={e => setCurrentPrice(Number(e.target.value))} />
        </label>
        <label>
          Strike Price:
          <input type="number" value={strike} onChange={e => setStrike(Number(e.target.value))} />
        </label>
        <label>
          Time to Maturity (Years):
          <input type="number" value={timeToMaturity} onChange={e => setTimeToMaturity(Number(e.target.value))} />
        </label>
        <label>
          Volatility (σ):
          <input type="number" value={volatility} onChange={e => setVolatility(Number(e.target.value))} />
        </label>
        <label>
          Risk-Free Interest Rate:
          <input type="number" value={interestRate} onChange={e => setInterestRate(Number(e.target.value))} />
        </label>
        <button onClick={calculate}>Calculate</button>
      </aside>
      <main>
        <h2>Results</h2>
        {callPrice !== null && <div>Call Price: ${callPrice.toFixed(2)}</div>}
        {putPrice !== null && <div>Put Price: ${putPrice.toFixed(2)}</div>}
        <h2>Heatmaps</h2>
        <Plot
          data={[heatmapData.call]}
          layout={{ title: 'Call Price Heatmap', xaxis: { title: 'Spot Price' }, yaxis: { title: 'Volatility' } }}
        />
        <Plot
          data={[heatmapData.put]}
          layout={{ title: 'Put Price Heatmap', xaxis: { title: 'Spot Price' }, yaxis: { title: 'Volatility' } }}
        />
      </main>
    </div>
  );
}
