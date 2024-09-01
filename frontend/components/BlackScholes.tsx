'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ScatterChart, Scatter, ZAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { MenuIcon, HelpCircleIcon, InfoIcon, Loader2 } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dock, DockIcon } from './magicui/dock'
import Link from 'next/link'
import Image from 'next/image'

// Add this function at the top of your file
function erf(x: number): number {
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
}

// Black-Scholes formula implementation
function blackScholes(S: number, K: number, T: number, r: number, sigma: number, type: 'call' | 'put'): { price: number; d1: number; d2: number } {
  const d1 = (Math.log(S / K) + (r + sigma ** 2 / 2) * T) / (sigma * Math.sqrt(T))
  const d2 = d1 - sigma * Math.sqrt(T)
  
  const Nd1 = 0.5 * (1 + erf(d1 / Math.sqrt(2)))
  const Nd2 = 0.5 * (1 + erf(d2 / Math.sqrt(2)))
  
  let price
  if (type === 'call') {
    price = S * Nd1 - K * Math.exp(-r * T) * Nd2
  } else {
    price = K * Math.exp(-r * T) * (1 - Nd2) - S * (1 - Nd1)
  }

  return { price, d1, d2 }
}

// Greek values calculation
function calculateGreeks(S: number, K: number, T: number, r: number, sigma: number, type: 'call' | 'put') {
  const { d1, d2 } = blackScholes(S, K, T, r, sigma, type)
  
  const Nd1 = 0.5 * (1 + erf(d1 / Math.sqrt(2)))
  const Nd2 = 0.5 * (1 + erf(d2 / Math.sqrt(2)))
  
  const delta = type === 'call' ? Nd1 : Nd1 - 1
  const gamma = Math.exp(-Math.pow(d1, 2) / 2) / (S * sigma * Math.sqrt(T) * Math.sqrt(2 * Math.PI))
  const vega = S * Math.sqrt(T) * Math.exp(-Math.pow(d1, 2) / 2) / Math.sqrt(2 * Math.PI)
  const theta = -(S * sigma * Math.exp(-Math.pow(d1, 2) / 2)) / (2 * Math.sqrt(T) * Math.sqrt(2 * Math.PI)) - 
                (type === 'call' ? r * K * Math.exp(-r * T) * Nd2 : -r * K * Math.exp(-r * T) * (1 - Nd2))
  const rho = type === 'call' ? K * T * Math.exp(-r * T) * Nd2 : -K * T * Math.exp(-r * T) * (1 - Nd2)

  return { delta, gamma, vega, theta, rho }
}

// Implied volatility calculation using Newton-Raphson method
function calculateImpliedVolatility(marketPrice: number, S: number, K: number, T: number, r: number, type: 'call' | 'put'): number {
  let sigma = 0.5
  const epsilon = 0.0001
  let iterations = 0

  while (iterations < 100) {
    const { price } = blackScholes(S, K, T, r, sigma, type)
    const vega = calculateGreeks(S, K, T, r, sigma, type).vega
    
    const diff = marketPrice - price
    if (Math.abs(diff) < epsilon) {
      return sigma
    }
    
    sigma += diff / vega
    iterations++
  }

  return NaN // If no convergence after 100 iterations
}

// Normal distribution function
function normalDist(x: number, mean: number, stdDev: number): number {
  return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2))
}

const BlackScholes: React.FC = () => {
  const [S, setS] = useState(100.00)
  const [K, setK] = useState(100.00)
  const [T, setT] = useState(1.00)
  const [r, setR] = useState(0.05)
  const [sigma, setSigma] = useState(0.2)
  const [chartData, setChartData] = useState<Array<{ stockPrice: number; callPrice: number; putPrice: number }>>([])
  const [surfaceData, setSurfaceData] = useState<Array<{ stockPrice: number; time: number; callPrice: number; putPrice: number }>>([])
  const [sensitivityData, setSensitivityData] = useState<Array<{ volatility: number; callPrice: number; putPrice: number }>>([])
  const [probabilityData, setProbabilityData] = useState<Array<{ price: number; probability: number }>>([])
  const [darkMode, setDarkMode] = useState(false)
  const [marketPrice, setMarketPrice] = useState(10)
  const [impliedVolatilityCall, setImpliedVolatilityCall] = useState<number | null>(null)
  const [impliedVolatilityPut, setImpliedVolatilityPut] = useState<number | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const [shouldUpdate, setShouldUpdate] = useState(false)
  const [isRunning, setIsRunning] = useState(false)

  const updateChartData = useCallback(() => {
    const newChartData = []
    for (let price = K * 0.5; price <= K * 1.5; price += K * 0.05) {
      newChartData.push({
        stockPrice: price,
        callPrice: blackScholes(price, K, T, r, sigma, 'call').price,
        putPrice: blackScholes(price, K, T, r, sigma, 'put').price
      })
    }
    setChartData(newChartData)
  }, [K, T, r, sigma])

  const updateSurfaceData = useCallback(() => {
    const newSurfaceData = []
    for (let price = K * 0.5; price <= K * 1.5; price += K * 0.1) {
      for (let time = 0.1; time <= T; time += 0.1) {
        newSurfaceData.push({
          stockPrice: price,
          time: time,
          callPrice: blackScholes(price, K, time, r, sigma, 'call').price,
          putPrice: blackScholes(price, K, time, r, sigma, 'put').price
        })
      }
    }
    setSurfaceData(newSurfaceData)
  }, [K, T, r, sigma])

  const updateSensitivityData = useCallback(() => {
    const newSensitivityData = []
    for (let vol = 0.05; vol <= 0.5; vol += 0.01) {
      newSensitivityData.push({
        volatility: vol,
        callPrice: blackScholes(S, K, T, r, vol, 'call').price,
        putPrice: blackScholes(S, K, T, r, vol, 'put').price
      })
    }
    setSensitivityData(newSensitivityData)
  }, [S, K, T, r])

  const updateProbabilityData = useCallback(() => {
    const mean = Math.log(S) + (r - 0.5 * sigma ** 2) * T
    const stdDev = sigma * Math.sqrt(T)
    const newProbabilityData = []
    for (let price = K * 0.5; price <= K * 1.5; price += K * 0.05) {
      newProbabilityData.push({
        price: price,
        probability: normalDist(Math.log(price), mean, stdDev)
      })
    }
    setProbabilityData(newProbabilityData)
  }, [S, K, T, r, sigma])

  const updateModel = useCallback(() => {
    setIsRunning(true)
    // Wrap the update functions in a setTimeout to allow the UI to update
    setTimeout(() => {
      updateChartData()
      updateSurfaceData()
      updateSensitivityData()
      updateProbabilityData()
      
      const ivCall = calculateImpliedVolatility(marketPrice, S, K, T, r, 'call')
      const ivPut = calculateImpliedVolatility(marketPrice, S, K, T, r, 'put')
      setImpliedVolatilityCall(isNaN(ivCall) ? null : ivCall)
      setImpliedVolatilityPut(isNaN(ivPut) ? null : ivPut)
      
      setIsRunning(false)
    }, 0)
  }, [S, K, T, r, sigma, marketPrice, updateChartData, updateSurfaceData, updateSensitivityData, updateProbabilityData])

  useEffect(() => {
    if (shouldUpdate) {
      updateModel()
      setShouldUpdate(false)
    }
  }, [shouldUpdate, updateModel])

  useEffect(() => {
    document.body.classList.toggle('dark', darkMode)
  }, [darkMode])

  const greeksCall = calculateGreeks(S, K, T, r, sigma, 'call')
  const greeksPut = calculateGreeks(S, K, T, r, sigma, 'put')
  const { price: callPrice } = blackScholes(S, K, T, r, sigma, 'call')
  const { price: putPrice } = blackScholes(S, K, T, r, sigma, 'put')

  const formatValue = (value: number, decimalPlaces: number) => {
    return value.toFixed(decimalPlaces);
  };

  const adjustValue = (setter: React.Dispatch<React.SetStateAction<number>>, value: number, increment: number, decimalPlaces: number) => {
    const newValue = Math.max(0, value + increment);
    setter(Number(newValue.toFixed(decimalPlaces)));
  };

  return (
    <div className={`flex h-screen ${darkMode ? 'dark' : ''}`}>
      <aside className={`bg-gray-100 dark:bg-gray-800 w-64 p-4 transition-all duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static fixed inset-y-0 left-0 z-50 overflow-hidden`}>
        <div className="flex flex-col h-full mt-6 overflow-y-auto">
          <h2 className="text-xl font-semibold mb-4">Parameters</h2>
          <div className="space-y-4 flex-grow">
            <Button 
              onClick={() => setShouldUpdate(true)} 
              className='bg-blue-500 text-white hover:bg-blue-600'
              disabled={isRunning}
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                'Run Model'
              )}
            </Button>
            <div>
              <Label htmlFor="stock">Stock Price (S)</Label>
              <div className="flex items-center">
                <Input
                  id="stock"
                  type="number"
                  value={formatValue(S, 2)}
                  onChange={(e) => setS(Number(e.target.value))}
                  min={1}
                  step={0.01}
                  className="flex-grow"
                />
                <Button onClick={() => adjustValue(setS, S, -0.01, 2)} className="text-black ml-1 px-2 py-1 bg-gray-200 hover:bg-red-200">-</Button>
                <Button onClick={() => adjustValue(setS, S, 0.01, 2)} className="text-black ml-1 px-2 py-1 bg-gray-200 hover:bg-green-200">+</Button>
              </div>
            </div>
            <div>
              <Label htmlFor="strike">Strike Price (K)</Label>
              <div className="flex items-center">
                <Input
                  id="strike"
                  type="number"
                  value={formatValue(K, 2)}
                  onChange={(e) => setK(Number(e.target.value))}
                  min={1}
                  step={0.01}
                  className="flex-grow"
                />
                <Button onClick={() => adjustValue(setK, K, -0.01, 2)} className="text-black ml-1 px-2 py-1 bg-gray-200 hover:bg-red-200">-</Button>
                <Button onClick={() => adjustValue(setK, K, 0.01, 2)} className="text-black ml-1 px-2 py-1 bg-gray-200 hover:bg-green-200">+</Button>
              </div>
            </div>
            <div>
              <Label htmlFor="maturity">Time to Maturity (T) in years</Label>
              <div className="flex items-center">
                <Input
                  id="maturity"
                  type="number"
                  value={formatValue(T, 2)}
                  onChange={(e) => setT(Number(e.target.value))}
                  min={0.01}
                  step={0.01}
                  className="flex-grow"
                />
                <Button onClick={() => adjustValue(setT, T, -0.01, 2)} className="text-black ml-1 px-2 py-1 bg-gray-200 hover:bg-red-200">-</Button>
                <Button onClick={() => adjustValue(setT, T, 0.01, 2)} className="text-black ml-1 px-2 py-1 bg-gray-200 hover:bg-green-200">+</Button>
              </div>
            </div>
            <div>
              <Label htmlFor="riskFree">Risk-free Rate (r)</Label>
              <div className="flex items-center">
                <Input
                  id="riskFree"
                  type="number"
                  value={formatValue(r, 2)}
                  onChange={(e) => setR(Number(e.target.value))}
                  min={0}
                  max={1}
                  step={0.01}
                  className="flex-grow"
                />
                <Button onClick={() => adjustValue(setR, r, -0.01, 2)} className="text-black ml-1 px-2 py-1 bg-gray-200 hover:bg-red-200">-</Button>
                <Button onClick={() => adjustValue(setR, r, 0.01, 2)} className="text-black ml-1 px-2 py-1 bg-gray-200 hover:bg-green-200">+</Button>
              </div>
            </div>
            <div>
              <Label htmlFor="volatility">Volatility (σ)</Label>
              <div className="flex items-center">
                <Input
                  id="volatility"
                  type="number"
                  value={formatValue(sigma, 2)}
                  onChange={(e) => setSigma(Number(e.target.value))}
                  min={0.01}
                  max={1}
                  step={0.01}
                  className="flex-grow"
                />
                <Button onClick={() => adjustValue(setSigma, sigma, -0.01, 2)} className="text-black ml-1 px-2 py-1 bg-gray-200 hover:bg-red-200">-</Button>
                <Button onClick={() => adjustValue(setSigma, sigma, 0.01, 2)} className="text-black ml-1 px-2 py-1 bg-gray-200 hover:bg-green-200">+</Button>
              </div>
            </div>
          </div>
          <div className="">
            <div className="flex items-center justify-between mb-3">
              <Label htmlFor="darkMode">Dark Mode</Label>
              <Switch
                id="darkMode"
                checked={darkMode}
                onCheckedChange={setDarkMode}
                className="ml-auto"
              />
            </div>
          </div>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">
      <header className=" -mt-17  px-4 py-2 ">
          <div className="flex justify-end space-x-4 mt-2">
            <div className="relative -mt-9">
              <Dock direction="middle">
                <DockIcon>
                  <Link href="https://www.linkedin.com/in/shaikhmubin/">
                    <Image src="/linkedin.png" alt='linkedin' width={20} height={20}/>
                  </Link>
                </DockIcon>
                <DockIcon>
                  <Link href="https://www.github.com/shaikhmubin02/option-pricing-models">
                    <Image src="/github.png" alt='github' width={20} height={20}/>
                  </Link>
                </DockIcon>
              </Dock>
            </div>
          </div>
        </header>
        <h1 className="text-2xl font-bold mb-3">Black-Scholes Model</h1>
            <div className="w-full overflow-auto">
            <Table className="border-collapse border border-gray-300 text-sm mb-5">
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="w-[50px] border border-gray-300 font-medium p-1 text-center">Parameter</TableHead>
                <TableHead className="border border-gray-300 font-medium p-1 text-right">Current Asset Price (S)</TableHead>
                <TableHead className="border border-gray-300 font-medium p-1 text-right">Strike Price (K)</TableHead>
                <TableHead className="border border-gray-300 font-medium p-1 text-right">Time to Maturity (T)</TableHead>
                <TableHead className="border border-gray-300 font-medium p-1 text-right">Volatility (σ)</TableHead>
                <TableHead className="border border-gray-300 font-medium p-1 text-right">Risk-Free Interest Rate (r)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="border border-gray-300 font-medium p-1 text-center">Value</TableCell>
                <TableCell className="border border-gray-300 p-1 text-right">{formatValue(S, 4)}</TableCell>
                <TableCell className="border border-gray-300 p-1 text-right">{formatValue(K, 4)}</TableCell>
                <TableCell className="border border-gray-300 p-1 text-right">{formatValue(T, 4)}</TableCell>
                <TableCell className="border border-gray-300 p-1 text-right">{formatValue(sigma, 4)}</TableCell>
                <TableCell className="border border-gray-300 p-1 text-right">{formatValue(r, 4)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          </div>
          <div className='flex justify-start px-3'>
        <div
          className="w-[200px] mt-5 -mb-4 py-2 px-4 bg-gray-200 text-black font-semibold rounded-md"
        >
          <p>d1: {blackScholes(S, K, T, r, sigma, 'call').d1.toFixed(4)}</p>
        </div> 
        <div
          className="w-[200px] ml-3 mt-5 -mb-4 py-2 px-4 bg-gray-200 text-black font-semibold rounded-md"
        >
          <p>d2: {blackScholes(S, K, T, r, sigma, 'call').d2.toFixed(4)}</p>
        </div>
        </div>
        <div className="grid grid-cols-2 gap-10 mt-10 mb-8">
          <Card className="bg-green-400 flex items-center justify-center">
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold mb-2">CALL Value</h3>
              <p className="text-2xl font-bold">${callPrice.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="bg-red-400 flex items-center justify-center">
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold mb-2">PUT Value</h3>
              <p className="text-2xl font-bold">${putPrice.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>
        <Card className="w-full mt-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <p className="text-lg font-semibold">Dynamic Visualizations of Option Pricing and Sensitivities</p>
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <MenuIcon className="h-6 w-6" />
              <span className="sr-only">Toggle sidebar</span>
            </Button>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="chart">
              <TabsList>
                <TabsTrigger value="chart">Option Prices</TabsTrigger>
                <TabsTrigger value="surface">3D Surface</TabsTrigger>
                <TabsTrigger value="sensitivity">Sensitivity</TabsTrigger>
                <TabsTrigger value="probability">Probability</TabsTrigger>
                <TabsTrigger value="greeks">Greeks</TabsTrigger>
                <TabsTrigger value="impliedVolatility">Implied Volatility</TabsTrigger>
                <TabsTrigger value="putCallParity">Put-Call Parity</TabsTrigger>
              </TabsList>
              <TabsContent value="chart">
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="stockPrice" 
                      label={{ value: 'Stock Price', position: 'insideBottomRight', offset: -10 }} 
                    />
                    <YAxis 
                      label={{ value: 'Option Price', angle: -90, position: 'insideLeft' }} 
                    />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="callPrice" stroke="#8884d8" name="Call Option" />
                    <Line type="monotone" dataKey="putPrice" stroke="#82ca9d" name="Put Option" />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>
              <TabsContent value="surface">
                <ResponsiveContainer width="100%" height={400}>
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid />
                    <XAxis type="number" dataKey="stockPrice" name="Stock Price" />
                    <YAxis type="number" dataKey="time" name="Time to Maturity" />
                    <ZAxis type="number" dataKey="callPrice" range={[0, 500]} name="Option Price" />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter name="Call Option Price" data={surfaceData} fill="#8884d8" />
                  </ScatterChart>
                </ResponsiveContainer>
              </TabsContent>
              <TabsContent value="sensitivity">
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={sensitivityData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="volatility" 
                      label={{ value: 'Volatility', position: 'insideBottomRight', offset: -10 }} 
                    />
                    <YAxis 
                      label={{ value: 'Option Price', angle: -90, position: 'insideLeft' }} 
                    />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="callPrice" stroke="#8884d8" name="Call Option" />
                    <Line type="monotone" dataKey="putPrice" stroke="#82ca9d" name="Put Option" />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>
              <TabsContent value="probability">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={probabilityData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="price" 
                      label={{ value: 'Stock Price', position: 'insideBottomRight', offset: -10 }} 
                    />
                    <YAxis 
                      label={{ value: 'Probability', angle: -90, position: 'insideLeft' }} 
                    />
                    <Tooltip />
                    <Bar dataKey="probability" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>
              <TabsContent value="greeks">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Call Option Greeks</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Greek</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead>Description</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell>Delta</TableCell>
                            <TableCell>{greeksCall.delta.toFixed(4)}</TableCell>
                            <TableCell>
                              <Popover>
                                <PopoverTrigger><HelpCircleIcon className="h-4 w-4" /></PopoverTrigger>
                                <PopoverContent>Rate of change of option price with respect to underlying asset price</PopoverContent>
                              </Popover>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Gamma</TableCell>
                            <TableCell>{greeksCall.gamma.toFixed(4)}</TableCell>
                            <TableCell>
                              <Popover>
                                <PopoverTrigger><HelpCircleIcon className="h-4 w-4" /></PopoverTrigger>
                                <PopoverContent>Rate of change of delta with respect to underlying asset price</PopoverContent>
                              </Popover>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Vega</TableCell>
                            <TableCell>{greeksCall.vega.toFixed(4)}</TableCell>
                            <TableCell>
                              <Popover>
                                <PopoverTrigger><HelpCircleIcon className="h-4 w-4" /></PopoverTrigger>
                                <PopoverContent>Rate of change of option price with respect to volatility</PopoverContent>
                              </Popover>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Theta</TableCell>
                            <TableCell>{greeksCall.theta.toFixed(4)}</TableCell>
                            <TableCell>
                              <Popover>
                                <PopoverTrigger><HelpCircleIcon className="h-4 w-4" /></PopoverTrigger>
                                <PopoverContent>Rate of change of option price with respect to time to expiration</PopoverContent>
                              </Popover>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Rho</TableCell>
                            <TableCell>{greeksCall.rho.toFixed(4)}</TableCell>
                            <TableCell>
                              <Popover>
                                <PopoverTrigger><HelpCircleIcon className="h-4 w-4" /></PopoverTrigger>
                                <PopoverContent>Rate of change of option price with respect to risk-free interest rate</PopoverContent>
                              </Popover>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Put Option Greeks</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Greek</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead>Description</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell>Delta</TableCell>
                            <TableCell>{greeksPut.delta.toFixed(4)}</TableCell>
                            <TableCell>
                              <Popover>
                                <PopoverTrigger><HelpCircleIcon className="h-4 w-4" /></PopoverTrigger>
                                <PopoverContent>Rate of change of option price with respect to underlying asset price</PopoverContent>
                              </Popover>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Gamma</TableCell>
                            <TableCell>{greeksPut.gamma.toFixed(4)}</TableCell>
                            <TableCell>
                              <Popover>
                                <PopoverTrigger><HelpCircleIcon className="h-4 w-4" /></PopoverTrigger>
                                <PopoverContent>Rate of change of delta with respect to underlying asset price</PopoverContent>
                              </Popover>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Vega</TableCell>
                            <TableCell>{greeksPut.vega.toFixed(4)}</TableCell>
                            <TableCell>
                              <Popover>
                                <PopoverTrigger><HelpCircleIcon className="h-4 w-4" /></PopoverTrigger>
                                <PopoverContent>Rate of change of option price with respect to volatility</PopoverContent>
                              </Popover>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Theta</TableCell>
                            <TableCell>{greeksPut.theta.toFixed(4)}</TableCell>
                            <TableCell>
                              <Popover>
                                <PopoverTrigger><HelpCircleIcon className="h-4 w-4" /></PopoverTrigger>
                                <PopoverContent>Rate of change of option price with respect to time to expiration</PopoverContent>
                              </Popover>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Rho</TableCell>
                            <TableCell>{greeksPut.rho.toFixed(4)}</TableCell>
                            <TableCell>
                              <Popover>
                                <PopoverTrigger><HelpCircleIcon className="h-4 w-4" /></PopoverTrigger>
                                <PopoverContent>Rate of change of option price with respect to risk-free interest rate</PopoverContent>
                              </Popover>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              <TabsContent value="impliedVolatility">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <Label htmlFor="marketPrice">Market Price</Label>
                    <Input
                      id="marketPrice"
                      type="number"
                      value={marketPrice}
                      onChange={(e) => setMarketPrice(Number(e.target.value))}
                      min={0.01}
                      step={0.01}
                    />
                  </div>
                  <div>
                    <Label>Call Option Implied Volatility</Label>
                    <Input
                      type="text"
                      value={impliedVolatilityCall ? `${(impliedVolatilityCall * 100).toFixed(2)}%` : 'N/A'}
                      readOnly
                    />
                  </div>
                  <div>
                    <Label>Put Option Implied Volatility</Label>
                    <Input
                      type="text"
                      value={impliedVolatilityPut ? `${(impliedVolatilityPut * 100).toFixed(2)}%` : 'N/A'}
                      readOnly
                    />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="putCallParity">
                <Card>
                  <CardHeader>
                    <CardTitle>Put-Call Parity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4">Put-Call Parity: C + Ke^(-rT) = P + S</p>
                    <p className="mb-2">Left side: {(callPrice + K * Math.exp(-r * T)).toFixed(4)}</p>
                    <p className="mb-2">Right side: {(putPrice + S).toFixed(4)}</p>
                    <p className="mb-2">Difference: {Math.abs(callPrice + K * Math.exp(-r * T) - (putPrice + S)).toFixed(4)}</p>
                    <Alert className="mt-4">
                      <AlertTitle>Note</AlertTitle>
                      <AlertDescription>
                        The difference should be close to zero if put-call parity holds. Small differences may occur due to rounding errors.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default BlackScholes