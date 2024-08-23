'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { LinkedinIcon, GithubIcon } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Slider } from './ui/slider'
import { CallPriceHeatmap, PutPriceHeatmap } from './Heatmap'

export default function BlackScholes() {
 
  const [minSpotPrice, setMinSpotPrice] = useState(80)
  const [maxSpotPrice, setMaxSpotPrice] = useState(120)
  const [minVolatility, setMinVolatility] = useState(0.10)
  const [maxVolatility, setMaxVolatility] = useState(0.30)

  const [heatmapData, setHeatmapData] = useState(null)

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

  const incrementValue = (field: keyof typeof formData, step: number = 0.01) => {
    setFormData((prevData) => ({
      ...prevData,
      [field]: parseFloat((prevData[field] + step).toFixed(2))
    }));
  };

  const decrementValue = (field: keyof typeof formData, step: number = 0.01) => {
    setFormData((prevData) => ({
      ...prevData,
      [field]: parseFloat((prevData[field] - step).toFixed(2))
    }));
  };

  // Increment and decrement for spot prices
  const incrementSpotPrice = (field: 'min' | 'max', step: number = 0.01) => {
    if (field === 'min') {
      setMinSpotPrice(prev => parseFloat((prev + step).toFixed(2)));
    } else {
      setMaxSpotPrice(prev => parseFloat((prev + step).toFixed(2)));
    }
  };

  const decrementSpotPrice = (field: 'min' | 'max', step: number = 0.01) => {
    if (field === 'min') {
      setMinSpotPrice(prev => parseFloat((prev - step).toFixed(2)));
    } else {
      setMaxSpotPrice(prev => parseFloat((prev - step).toFixed(2)));
    }
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

  useEffect(() => {
    const fetchHeatmapData = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/heatmap', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            K: formData.K,
            T: formData.T,
            r: formData.r,
            min_spot_price: minSpotPrice,
            max_spot_price: maxSpotPrice,
            min_volatility: minVolatility,
            max_volatility: maxVolatility,
            spot_steps: 10,
            volatility_steps: 10,
          }),
        });
        if (!res.ok) throw new Error('Failed to fetch heatmap data');
        const data = await res.json();
        setHeatmapData(data);
      } catch (err) {
        console.error('Failed to fetch heatmap data:', err);
      }
    };

    fetchHeatmapData();
  }, [formData.K, formData.T, formData.r, minSpotPrice, maxSpotPrice, minVolatility, maxVolatility]);

  if (!heatmapData) return <div>Loading...</div>;

  return (
    <div className="flex bg-white">
      {/* Sidebar */}
      <div className="w-68 bg-gray-100 shadow-md">
        <div className="p-4 border-b">
          <div className="flex items-center space-x-2 pt-14">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
            >
              <path d="M3 3v18h18" />
              <path d="m19 9-5 5-4-4-3 3" />
            </svg>
            <h1 className="text-xl font-bold">Black-Scholes Model</h1>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
        <div className="p-4 space-y-4">
        <button
          type="submit"
          className="w-[100px] py-2 px-4 bg-blue-500 text-black text-white font-semibold rounded-md hover:bg-blue-600"
          disabled={loading}
        >
          {loading ? 'Running...' : 'Calculate'}
        </button>
          <div>
            <Label htmlFor="currentAssetPrice">Current Asset Price</Label>
            <div className="flex">
              <Input
                type="number"
                name="S"
                value={formData.S.toFixed(2)}
                onChange={handleChange}
                required
                step="0.01"
              />
              <Button variant="outline" size="icon" className="ml-2 hover:bg-red-200" onClick={() => decrementValue('S')}>-</Button>
              <Button variant="outline" size="icon" className="ml-2 hover:bg-green-200" onClick={() => incrementValue('S')}>+</Button>
            </div>
          </div>
          <div>
            <Label htmlFor="strikePrice">Strike Price</Label>
            <div className="flex">
              <Input
                 type="number"
                 name="K"
                 value={formData.K.toFixed(2)}
                 onChange={handleChange}
                 required
                 step="0.01"
              />
              <Button variant="outline" size="icon" className="ml-2 hover:bg-red-200" onClick={()=> decrementValue('K')}>-</Button>
              <Button variant="outline" size="icon" className="ml-2 hover:bg-green-200" onClick={()=> incrementValue('K')}>+</Button>
            </div>
          </div>
          <div>
            <Label htmlFor="timeToMaturity">Time to Maturity (Years)</Label>
            <div className="flex">
              <Input
                type="number"
                step="0.01"
                name="T"
                value={formData.T.toFixed(2)}
                onChange={handleChange}
                required
              />
              <Button variant="outline" size="icon" className="ml-2 hover:bg-red-200" onClick={()=> decrementValue('T')}>-</Button>
              <Button variant="outline" size="icon" className="ml-2 hover:bg-green-200" onClick={()=> incrementValue('T')}>+</Button>
            </div>
          </div>
          <div>
            <Label htmlFor="volatility">Volatility (σ)</Label>
            <div className="flex">
              <Input
               type="number"
               step="0.01"
               name="sigma"
               value={formData.sigma.toFixed(2)}
               onChange={handleChange}
               required
              />
              <Button variant="outline" size="icon" className="ml-2 hover:bg-red-200" onClick={()=> decrementValue('sigma')}>-</Button>
              <Button variant="outline" size="icon" className="ml-2 hover:bg-green-200" onClick={()=> incrementValue('sigma')}>+</Button>
            </div>
          </div>
          <div>
            <Label htmlFor="riskFreeRate">Risk-Free Interest Rate</Label>
            <div className="flex">
              <Input
                type="number"
                step="0.01"
                name="r"
                value={formData.r.toFixed(2)}
                onChange={handleChange}
                required
              />
              <Button variant="outline" size="icon" className="ml-2 hover:bg-red-200" onClick={()=> decrementValue('r')}>-</Button>
              <Button variant="outline" size="icon" className="ml-2 hover:bg-green-200" onClick={()=> incrementValue('r')}>+</Button>
            </div>
          </div>
        </div>
        </form>
        <div className="p-4 border-t">
          <h2 className="font-semibold mb-2">Heatmap Parameters</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="minSpotPrice">Min Spot Price</Label>
              <div className="flex">
                <Input
                  id="minSpotPrice"
                  type="number"
                  value={minSpotPrice.toFixed(2)}
                  onChange={(e) => setMinSpotPrice(Number(e.target.value))}
                />
                <Button variant="outline" size="icon" className="ml-2 hover:bg-red-200" onClick={()=> decrementSpotPrice('min')}>-</Button>
                <Button variant="outline" size="icon" className="ml-2 hover:bg-green-200" onClick={()=> incrementSpotPrice('min')}>+</Button>
              </div>
            </div>
            <div>
              <Label htmlFor="maxSpotPrice">Max Spot Price</Label>
              <div className="flex">
                <Input
                  id="maxSpotPrice"
                  type="number"
                  value={maxSpotPrice.toFixed(2)}
                  onChange={(e) => setMaxSpotPrice(Number(e.target.value))}
                />
                <Button variant="outline" size="icon" className="ml-2 hover:bg-red-200" onClick={()=> decrementSpotPrice('max')}>-</Button>
                <Button variant="outline" size="icon" className="ml-2 hover:bg-green-200" onClick={()=> incrementSpotPrice('max')}>+</Button>
              </div>
            </div>
            <div className='bg-gray-100'>
              <Label htmlFor="min-volatility">Min Volatility for Heatmap</Label>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">0.01</span>
                  <span className="text-sm font-medium text-gray-900">{minVolatility.toFixed(2)}</span>
                  <span className="text-sm text-gray-500">1.00</span>
                </div>
                <Slider
                  id="min-volatility"
                  min={0.01}
                  max={1}
                  step={0.01}
                  value={[minVolatility]}
                  onValueChange={(value) => setMinVolatility(value[0])}
                  className="w-full"
                />
              </div>
                <div>
                  <Label htmlFor="max-volatility">Max Volatility for Heatmap</Label>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">0.01</span>
                    <span className="text-sm font-medium text-gray-900">{maxVolatility.toFixed(2)}</span>
                    <span className="text-sm text-gray-500">1.00</span>
                  </div>
                  <Slider
                    id="max-volatility"
                    min={0.01}
                    max={1}
                    step={0.01}
                    value={[maxVolatility]}
                    onValueChange={(value) => setMaxVolatility(value[0])}
                    className="w-full"
                  />
                </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 p-16 overflow-auto">
        <h2 className="text-3xl font-bold mb-6 pt-14">Black-Scholes Pricing Model</h2>

        <div className="w-full overflow-auto">
          <Table className="border-collapse border border-gray-300 text-sm">
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="w-[50px] border border-gray-300 font-medium p-1 text-center"></TableHead>
                <TableHead className="border border-gray-300 font-medium p-1 text-right">Current Asset Price (S)</TableHead>
                <TableHead className="border border-gray-300 font-medium p-1 text-right">Strike Price (K)</TableHead>
                <TableHead className="border border-gray-300 font-medium p-1 text-right">Time to Maturity (t)</TableHead>
                <TableHead className="border border-gray-300 font-medium p-1 text-right">Volatility (σ)</TableHead>
                <TableHead className="border border-gray-300 font-medium p-1 text-right">Risk-Free Interest Rate (r)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="border border-gray-300 font-medium p-1 text-center">0</TableCell>
                <TableCell className="border border-gray-300 p-1 text-right">{formData.S.toFixed(4)}</TableCell>
                <TableCell className="border border-gray-300 p-1 text-right">{formData.K.toFixed(4)}</TableCell>
                <TableCell className="border border-gray-300 p-1 text-right">{formData.T.toFixed(4)}</TableCell>
                <TableCell className="border border-gray-300 p-1 text-right">{formData.sigma.toFixed(4)}</TableCell>
                <TableCell className="border border-gray-300 p-1 text-right">{formData.r.toFixed(4)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div className="grid grid-cols-2 gap-10 mt-10 mb-8">
          <Card className="bg-green-400 flex items-center justify-center">
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold mb-2">CALL Value</h3>
              <p className="text-2xl font-bold">${result?.call_price.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="bg-red-400 flex items-center justify-center">
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold mb-2">PUT Value</h3>
              <p className="text-2xl font-bold">${result?.put_price.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        <h2 className="text-2xl font-bold mb-4">Options Price - Interactive Heatmap</h2>
        
        <Card className="bg-blue-50 mb-6">
          <CardContent className="p-4">
            <p>Explore how option prices fluctuate with varying &apos;Spot Prices and Volatility&apos; levels using interactive heatmap parameters, all while maintaining a constant &apos;Strike Price&apos;.</p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-xl font-semibold mb-6 flex justify-center">Call Price Heatmap</h3>
            <CallPriceHeatmap data={heatmapData}/>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-6 flex justify-center">Put Price Heatmap</h3>
            <PutPriceHeatmap data={heatmapData}/>
          </div>
        </div>
      </div>
    </div>
  )
}