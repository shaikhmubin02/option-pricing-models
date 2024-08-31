'use client'

import React, { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ScatterChart, Scatter, AreaChart, Area } from 'recharts'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { AlertCircle, Plus, Minus, Dice1Icon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dock, DockIcon } from './magicui/dock'
import Link from 'next/link'
import Image from 'next/image'

// Add this function at the top of your file, outside the component
const erf = (x: number): number => {
  const t = 1 / (1 + 0.5 * Math.abs(x));
  const tau = t * Math.exp(-x * x - 1.26551223 + 1.00002368 * t + 0.37409196 * t * t + 0.09678418 * t * t * t - 0.18628806 * t * t * t * t + 0.27886807 * t * t * t * t * t - 1.13520398 * t * t * t * t * t * t + 1.48851587 * t * t * t * t * t * t * t - 0.82215223 * t * t * t * t * t * t * t * t + 0.17087277 * t * t * t * t * t * t * t * t * t);
  return x >= 0 ? 1 - tau : tau - 1;
}

// Function to generate a random number from a standard normal distribution
const randn = () => {
  let u = 0, v = 0;
  while(u === 0) u = Math.random();
  while(v === 0) v = Math.random();
  return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
}

// Black-Scholes formula
const blackScholes = (S, K, T, r, sigma, type) => {
  const d1 = (Math.log(S / K) + (r + sigma ** 2 / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  const Nd1 = 0.5 * (1 + erf(d1 / Math.sqrt(2)));
  const Nd2 = 0.5 * (1 + erf(d2 / Math.sqrt(2)));
  if (type === 'call') {
    return S * Nd1 - K * Math.exp(-r * T) * Nd2;
  } else {
    return K * Math.exp(-r * T) * (1 - Nd2) - S * (1 - Nd1);
  }
}

// Implied Volatility calculation using Newton-Raphson method
const impliedVolatility = (price, S, K, T, r, type, tolerance = 0.0001, maxIterations = 100) => {
  let sigma = 0.5;
  for (let i = 0; i < maxIterations; i++) {
    const price_estimate = blackScholes(S, K, T, r, sigma, type);
    const diff = price_estimate - price;
    if (Math.abs(diff) < tolerance) {
      return sigma;
    }
    const vega = S * Math.sqrt(T) * Math.exp(-0.5 * (Math.log(S / K) + (r + sigma ** 2 / 2) * T) ** 2 / (sigma ** 2 * T)) / Math.sqrt(2 * Math.PI);
    sigma = sigma - diff / vega;
  }
  return null;
}

export default function Component() {
  const [spot, setSpot] = useState(100)
  const [strike, setStrike] = useState(100)
  const [volatility, setVolatility] = useState(0.2)
  const [riskFreeRate, setRiskFreeRate] = useState(0.05)
  const [timeToMaturity, setTimeToMaturity] = useState(1)
  const [numSimulations, setNumSimulations] = useState(10000)
  const [numSteps, setNumSteps] = useState(252)
  const [callOptionPrice, setCallOptionPrice] = useState(0)
  const [putOptionPrice, setPutOptionPrice] = useState(0)
  const [callConfidenceInterval, setCallConfidenceInterval] = useState([0, 0])
  const [putConfidenceInterval, setPutConfidenceInterval] = useState([0, 0])
  const [pricePaths, setPricePaths] = useState([])
  const [histogram, setHistogram] = useState([])
  const [callGreeks, setCallGreeks] = useState({ delta: 0, gamma: 0, theta: 0, vega: 0 })
  const [putGreeks, setPutGreeks] = useState({ delta: 0, gamma: 0, theta: 0, vega: 0 })
  const [callBlackScholesPrice, setCallBlackScholesPrice] = useState(0)
  const [putBlackScholesPrice, setPutBlackScholesPrice] = useState(0)
  const [executionTime, setExecutionTime] = useState(0)
  const [impliedVolCall, setImpliedVolCall] = useState(0)
  const [impliedVolPut, setImpliedVolPut] = useState(0)
  const [putCallParity, setPutCallParity] = useState(0)
  const [sensitivityData, setSensitivityData] = useState([])
  const [strategyType, setStrategyType] = useState('long_call')
  const [strategyPayoff, setStrategyPayoff] = useState([])

  const [volatilitySmileData, setVolatilitySmileData] = useState([])
  const [showAlert, setShowAlert] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [greeksOverTime, setGreeksOverTime] = useState([])
  const [optionValueDistribution, setOptionValueDistribution] = useState([])
  const [probabilityITM, setProbabilityITM] = useState({ call: 0, put: 0 })

  // Initialize inputsChanged to true
  const [inputsChanged, setInputsChanged] = useState(true)

  // Modify the adjustValue function to set inputsChanged to true
  const adjustValue = (setter: React.Dispatch<React.SetStateAction<number>>, value: number, increment: number) => {
    setter(prevValue => {
      const newValue = Math.max(0, Number((prevValue + increment).toFixed(2)))
      setInputsChanged(true)
      return newValue
    })
  }

  // Create a new function to handle input changes
  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<number>>, value: number) => {
    setter(Number(value))
    setInputsChanged(true)
  }

  // Modify the runSimulation function
  const runSimulation = () => {
    if (!inputsChanged) {
      console.log("Inputs haven't changed. Skipping simulation.")
      return
    }

    const startTime = performance.now()
    const dt = timeToMaturity / numSteps
    const drift = (riskFreeRate - 0.5 * volatility * volatility) * dt
    const diffusion = volatility * Math.sqrt(dt)

    let sumCallPayoffs = 0
    let sumCallPayoffsSquared = 0
    let sumPutPayoffs = 0
    let sumPutPayoffsSquared = 0
    let newPricePaths = []
    let finalPrices = []

    for (let i = 0; i < numSimulations; i++) {
      let path = [{ time: 0, price: spot }]
      let price = spot

      for (let j = 1; j <= numSteps; j++) {
        price = price * Math.exp(drift + diffusion * randn())
        if (i < 10) { // Only store first 10 paths for visualization
          path.push({ time: j * dt, price: price })
        }
      }

      if (i < 10) {
        newPricePaths.push(path)
      }

      finalPrices.push(price)

      // Calculate payoffs
      let callPayoff = Math.max(price - strike, 0)
      let putPayoff = Math.max(strike - price, 0)
      sumCallPayoffs += callPayoff
      sumCallPayoffsSquared += callPayoff * callPayoff
      sumPutPayoffs += putPayoff
      sumPutPayoffsSquared += putPayoff * putPayoff
    }

    const averageCallPayoff = sumCallPayoffs / numSimulations
    const averagePutPayoff = sumPutPayoffs / numSimulations
    const calculatedCallOptionPrice = averageCallPayoff * Math.exp(-riskFreeRate * timeToMaturity)
    const calculatedPutOptionPrice = averagePutPayoff * Math.exp(-riskFreeRate * timeToMaturity)
    
    // Calculate confidence intervals
    const callStandardError = Math.sqrt((sumCallPayoffsSquared / numSimulations - averageCallPayoff * averageCallPayoff) / (numSimulations - 1))
    const putStandardError = Math.sqrt((sumPutPayoffsSquared / numSimulations - averagePutPayoff * averagePutPayoff) / (numSimulations - 1))
    const callMarginOfError = 1.96 * callStandardError / Math.sqrt(numSimulations)
    const putMarginOfError = 1.96 * putStandardError / Math.sqrt(numSimulations)
    const callLowerBound = (averageCallPayoff - callMarginOfError) * Math.exp(-riskFreeRate * timeToMaturity)
    const callUpperBound = (averageCallPayoff + callMarginOfError) * Math.exp(-riskFreeRate * timeToMaturity)
    const putLowerBound = (averagePutPayoff - putMarginOfError) * Math.exp(-riskFreeRate * timeToMaturity)
    const putUpperBound = (averagePutPayoff + putMarginOfError) * Math.exp(-riskFreeRate * timeToMaturity)

    // Calculate Greeks
    const deltaH = 0.01 * spot
    const callDeltaPriceUp = blackScholes(spot + deltaH, strike, timeToMaturity, riskFreeRate, volatility, 'call')
    const callDeltaPriceDown = blackScholes(spot - deltaH, strike, timeToMaturity, riskFreeRate, volatility, 'call')
    const putDeltaPriceUp = blackScholes(spot + deltaH, strike, timeToMaturity, riskFreeRate, volatility, 'put')
    const putDeltaPriceDown = blackScholes(spot - deltaH, strike, timeToMaturity, riskFreeRate, volatility, 'put')
    const callDelta = (callDeltaPriceUp - callDeltaPriceDown) / (2 * deltaH)
    const putDelta = (putDeltaPriceUp - putDeltaPriceDown) / (2 * deltaH)
    const callGamma = (callDeltaPriceUp - 2 * calculatedCallOptionPrice + callDeltaPriceDown) / (deltaH * deltaH)
    const putGamma = (putDeltaPriceUp - 2 * calculatedPutOptionPrice + putDeltaPriceDown) / (deltaH * deltaH)
    
    const thetaH = 1/365
    const callThetaPrice = blackScholes(spot, strike, timeToMaturity - thetaH, riskFreeRate, volatility, 'call')
    const putThetaPrice = blackScholes(spot, strike, timeToMaturity - thetaH, riskFreeRate, volatility, 'put')
    const callTheta = (callThetaPrice - calculatedCallOptionPrice) / thetaH
    const putTheta = (putThetaPrice - calculatedPutOptionPrice) / thetaH

    const vegaH = 0.01
    const callVegaPrice = blackScholes(spot, strike, timeToMaturity, riskFreeRate, volatility + vegaH, 'call')
    const putVegaPrice = blackScholes(spot, strike, timeToMaturity, riskFreeRate, volatility + vegaH, 'put')
    const callVega = (callVegaPrice - calculatedCallOptionPrice) / vegaH
    const putVega = (putVegaPrice - calculatedPutOptionPrice) / vegaH

    // Histogram calculation
    const histogramData = Array(20).fill(0)
    const minPrice = Math.min(...finalPrices)
    const maxPrice = Math.max(...finalPrices)
    const histogramBinSize = (maxPrice - minPrice) / 20
    finalPrices.forEach(price => {
      const binIndex = Math.min(Math.floor((price - minPrice) / histogramBinSize), 19)
      histogramData[binIndex]++
    })
    const newHistogram = histogramData.map((count, index) => ({
      price: minPrice + (index + 0.5) * histogramBinSize,
      count: count / numSimulations
    }))

    // Calculate Black-Scholes prices
    const bsCallPrice = blackScholes(spot, strike, timeToMaturity, riskFreeRate, volatility, 'call')
    const bsPutPrice = blackScholes(spot, strike, timeToMaturity, riskFreeRate, volatility, 'put')

    // Calculate Implied Volatility
    const ivCall = impliedVolatility(calculatedCallOptionPrice, spot, strike, timeToMaturity, riskFreeRate, 'call')
    const ivPut = impliedVolatility(calculatedPutOptionPrice, spot, strike, timeToMaturity, riskFreeRate, 'put')

    // Check Put-Call Parity
    const parityDiff = calculatedCallOptionPrice - calculatedPutOptionPrice - spot + strike * Math.exp(-riskFreeRate * timeToMaturity)

    // Sensitivity Analysis
    const sensitivitySteps = 10
    const spotRange = spot * 0.2
    const sensitivityData = []
    for (let i = 0; i <= sensitivitySteps; i++) {
      const spotPrice = spot - spotRange + (2 * spotRange * i) / sensitivitySteps
      sensitivityData.push({
        spot: spotPrice,
        call: blackScholes(spotPrice, strike, timeToMaturity, riskFreeRate, volatility, 'call'),
        put: blackScholes(spotPrice, strike, timeToMaturity, riskFreeRate, volatility, 'put')
      })
    }

    // Strategy Payoff
    const strategyPayoff = sensitivityData.map(data => {
      let payoff = 0
      switch (strategyType) {
        case 'long_call':
          payoff = Math.max(data.spot - strike, 0) - bsCallPrice
          break
        case 'long_put':
          payoff = Math.max(strike - data.spot, 0) - bsPutPrice
          break
        case 'bull_call_spread':
          const higherStrike = strike * 1.1
          payoff = Math.max(data.spot - strike, 0) - Math.max(data.spot - higherStrike, 0) - 
                   (blackScholes(spot, strike, timeToMaturity, riskFreeRate, volatility, 'call') - 
                    blackScholes(spot, higherStrike, timeToMaturity, riskFreeRate, volatility, 'call'))
          break
      }
      return { spot: data.spot, payoff }
    })

    // Add Volatility Smile calculation
    const strikes = Array.from({length: 11}, (_, i) => strike * (0.8 + i * 0.04))
    const volatilitySmile = strikes.map(k => {
      const callPrice = blackScholes(spot, k, timeToMaturity, riskFreeRate, volatility, 'call')
      const impliedVol = impliedVolatility(callPrice, spot, k, timeToMaturity, riskFreeRate, 'call')
      return { strike: k, impliedVolatility: impliedVol }
    })
    setVolatilitySmileData(volatilitySmile)

    // Add alert for unrealistic parameters
    if (volatility > 1 || riskFreeRate > 0.2) {
      setShowAlert(true)
      setAlertMessage('Warning: The input parameters may be unrealistic. Please review your inputs.')
    } else {
      setShowAlert(false)
    }

    // Add Greeks over time calculation
    const timeSteps = 50
    const greeksOverTime = Array.from({ length: timeSteps }, (_, i) => {
      const t = (timeToMaturity * i) / (timeSteps - 1)
      const callPrice = blackScholes(spot, strike, t, riskFreeRate, volatility, 'call')
      const putPrice = blackScholes(spot, strike, t, riskFreeRate, volatility, 'put')
      const callDelta = (blackScholes(spot + 0.01, strike, t, riskFreeRate, volatility, 'call') - callPrice) / 0.01
      const putDelta = (blackScholes(spot + 0.01, strike, t, riskFreeRate, volatility, 'put') - putPrice) / 0.01
      const gamma = (blackScholes(spot + 0.01, strike, t, riskFreeRate, volatility, 'call') - 2 * callPrice + blackScholes(spot - 0.01, strike, t, riskFreeRate, volatility, 'call')) / (0.01 * 0.01)
      const theta = (blackScholes(spot, strike, t + 1/365, riskFreeRate, volatility, 'call') - callPrice) / (1/365)
      const vega = (blackScholes(spot, strike, t, riskFreeRate, volatility + 0.01, 'call') - callPrice) / 0.01
      return { time: t, callDelta, putDelta, gamma, theta, vega }
    })
    setGreeksOverTime(greeksOverTime)

    // Add option value distribution calculation
    const bins = 30
    const optionValues = finalPrices.map(price => Math.max(price - strike, 0))
    const minValue = Math.min(...optionValues)
    const maxValue = Math.max(...optionValues)
    const optionValueBinSize = (maxValue - minValue) / bins
    const optionValueDistribution = Array.from({ length: bins }, (_, i) => {
      const binStart = minValue + i * optionValueBinSize
      const binEnd = binStart + optionValueBinSize
      const count = optionValues.filter(value => value >= binStart && value < binEnd).length
      return { value: (binStart + binEnd) / 2, count: count / numSimulations }
    })
    setOptionValueDistribution(optionValueDistribution)

    // Calculate probability of options expiring in-the-money
    const probabilityCallITM = finalPrices.filter(price => price > strike).length / numSimulations
    const probabilityPutITM = finalPrices.filter(price => price < strike).length / numSimulations
    setProbabilityITM({ call: probabilityCallITM, put: probabilityPutITM })

    setCallOptionPrice(calculatedCallOptionPrice)
    setPutOptionPrice(calculatedPutOptionPrice)
    setCallConfidenceInterval([callLowerBound, callUpperBound])
    setPutConfidenceInterval([putLowerBound, putUpperBound])
    setPricePaths(newPricePaths)
    setHistogram(newHistogram)
    setCallGreeks({ delta: callDelta, gamma: callGamma, theta: callTheta, vega: callVega })
    setPutGreeks({ delta: putDelta, gamma: putGamma, theta: putTheta, vega: putVega })
    setCallBlackScholesPrice(bsCallPrice)
    setPutBlackScholesPrice(bsPutPrice)
    setImpliedVolCall(ivCall)
    setImpliedVolPut(ivPut)
    setPutCallParity(parityDiff)
    setSensitivityData(sensitivityData)
    setStrategyPayoff(strategyPayoff)
    setExecutionTime(performance.now() - startTime)
    setInputsChanged(false)
  }

  // Modify the useEffect hook
  useEffect(() => {
    runSimulation()
  }, []) // Empty dependency array means this effect runs once on mount

  return (
    <div className="flex flex-col lg:flex-row">
      <Card className="bg-gray-100 rounded-none border-none">
        <CardHeader>
          <CardTitle className='text-lg'>Input Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button 
              onClick={runSimulation} 
              className="mt-4 bg-blue-500 hover:bg-blue-600"
              disabled={!inputsChanged}
            >
              Run Simulation
            </Button>
            <div>
              <Label htmlFor="spot">Spot Price</Label>
              <div className="flex items-center">
                <Input
                  id="spot"
                  type="number"
                  step="0.01"
                  value={spot}
                  onChange={(e) => handleInputChange(setSpot, Number(e.target.value))}
                  className="mr-2"
                />
                <Button onClick={() => adjustValue(setSpot, spot, -0.01)} variant="outline" size="icon" className="bg-red-100 hover:bg-red-200">
                  <Minus className="h-4 w-4" />
                </Button>
                <Button onClick={() => adjustValue(setSpot, spot, 0.01)} variant="outline" size="icon" className="bg-green-100 hover:bg-green-200 ml-1">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="strike">Strike Price</Label>
              <div className="flex items-center">
                <Input
                  id="strike"
                  type="number"
                  step="0.01"
                  value={strike}
                  onChange={(e) => handleInputChange(setStrike, Number(e.target.value))}
                  className="mr-2"
                />
                <Button onClick={() => adjustValue(setStrike, strike, -0.01)} variant="outline" size="icon" className="bg-red-100 hover:bg-red-200">
                  <Minus className="h-4 w-4" />
                </Button>
                <Button onClick={() => adjustValue(setStrike, strike, 0.01)} variant="outline" size="icon" className="bg-green-100 hover:bg-green-200 ml-1">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="volatility">Volatility</Label>
              <div className="flex items-center">
                <Input
                  id="volatility"
                  type="number"
                  value={volatility}
                  onChange={(e) => handleInputChange(setVolatility, Number(e.target.value))}
                  className="mr-2"
                />
                <Button onClick={() => adjustValue(setVolatility, volatility, -0.01)} variant="outline" size="icon" className="bg-red-100 hover:bg-red-200">
                  <Minus className="h-4 w-4" />
                </Button>
                <Button onClick={() => adjustValue(setVolatility, volatility, 0.01)} variant="outline" size="icon" className="bg-green-100 hover:bg-green-200 ml-1">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="riskFreeRate">Risk-Free Rate</Label>
              <div className="flex items-center">
                <Input
                  id="riskFreeRate"
                  type="number"
                  step="0.01"
                  value={riskFreeRate}
                  onChange={(e) => handleInputChange(setRiskFreeRate, Number(e.target.value))}
                  className="mr-2"
                />
                <Button onClick={() => adjustValue(setRiskFreeRate, riskFreeRate, -0.01)} variant="outline" size="icon" className="bg-red-100 hover:bg-red-200">
                  <Minus className="h-4 w-4" />
                </Button>
                <Button onClick={() => adjustValue(setRiskFreeRate, riskFreeRate, 0.01)} variant="outline" size="icon" className="bg-green-100 hover:bg-green-200 ml-1">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="timeToMaturity">Time to Maturity (years)</Label>
              <div className="flex items-center">
                <Input
                  id="timeToMaturity"
                  type="number"
                  step="0.1"
                  value={timeToMaturity}
                  onChange={(e) => handleInputChange(setTimeToMaturity, Number(e.target.value))}
                  className="mr-2"
                />
                <Button onClick={() => adjustValue(setTimeToMaturity, timeToMaturity, -0.1)} variant="outline" size="icon" className="bg-red-100 hover:bg-red-200">
                  <Minus className="h-4 w-4" />
                </Button>
                <Button onClick={() => adjustValue(setTimeToMaturity, timeToMaturity, 0.1)} variant="outline" size="icon" className="bg-green-100 hover:bg-green-200 ml-1">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="numSimulations">Number of Simulations</Label>
              <div className="flex items-center">
                <Input
                  id="numSimulations"
                  type="number"
                  value={numSimulations}
                  onChange={(e) => handleInputChange(setNumSimulations, Number(e.target.value))}
                  className="mr-2"
                />
                <Button onClick={() => adjustValue(setNumSimulations, numSimulations, -100)} variant="outline" size="icon" className="bg-red-100 hover:bg-red-200">
                  <Minus className="h-4 w-4" />
                </Button>
                <Button onClick={() => adjustValue(setNumSimulations, numSimulations, 100)} variant="outline" size="icon" className="bg-green-100 hover:bg-green-200 ml-1">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="strategyType">Option Strategy</Label>
              <Select value={strategyType} onValueChange={setStrategyType}>
                <SelectTrigger id="strategyType">
                  <SelectValue placeholder="Select strategy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="long_call">Long Call</SelectItem>
                  <SelectItem value="long_put">Long Put</SelectItem>
                  <SelectItem value="bull_call_spread">Bull Call Spread</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="w-full lg:w-3/4 space-y-4 p-3 mt-16">
        <Card className='rounded-none border-none'>
        <header className=" -mt-16  px-4 py-2 ">
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
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dice1Icon className="h-5 w-5" />
                Monte Carlo Simulation
            </CardTitle>
            <CardDescription>Visualize price paths and analyze option prices</CardDescription>
          </CardHeader>
          <CardContent className="flex-col items-start">
            <div className="grid grid-cols-2 gap-4 w-full">
              <div>
                <h3 className="text-lg font-semibold">Call Option</h3>
                <p className="text-2xl font-bold">${callOptionPrice.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">
                    95% CI: [${callConfidenceInterval[0].toFixed(2)}, ${callConfidenceInterval[1].toFixed(2)}]
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Black-Scholes: ${callBlackScholesPrice.toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Implied Volatility: {(impliedVolCall * 100).toFixed(2)}%
                  </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Put Option</h3>
                <p className="text-2xl font-bold">${putOptionPrice.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">
                    95% CI: [${putConfidenceInterval[0].toFixed(2)}, ${putConfidenceInterval[1].toFixed(2)}]
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Black-Scholes: ${putBlackScholesPrice.toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Implied Volatility: {(impliedVolPut * 100).toFixed(2)}%
                  </p>
              </div>
            </div>
              <div className="mt-4 w-full">
                <h3 className="text-lg font-semibold mb-2">Greeks</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold">Call Option</h4>
                    <p>Delta: {callGreeks.delta.toFixed(4)}</p>
                    <p>Gamma: {callGreeks.gamma.toFixed(4)}</p>
                    <p>Theta: {callGreeks.theta.toFixed(4)}</p>
                    <p>Vega: {callGreeks.vega.toFixed(4)}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold">Put Option</h4>
                    <p>Delta: {putGreeks.delta.toFixed(4)}</p>
                    <p>Gamma: {putGreeks.gamma.toFixed(4)}</p>
                    <p>Theta: {putGreeks.theta.toFixed(4)}</p>
                    <p>Vega: {putGreeks.vega.toFixed(4)}</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 w-full">
                <h3 className="text-lg font-semibold">Put-Call Parity</h3>
                <p>Difference: ${putCallParity.toFixed(4)}</p>
              </div>
            <div className="mt-4 w-full">
              <p className="text-sm text-muted-foreground">Execution time: {executionTime.toFixed(2)} ms</p>
            </div>
          </CardContent>
          <CardContent>
            {showAlert && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>{alertMessage}</AlertDescription>
              </Alert>
            )}
            <Tabs defaultValue="pricePaths">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="pricePaths">Price Paths</TabsTrigger>
                <TabsTrigger value="optionValue">Option Value</TabsTrigger>
                <TabsTrigger value="greeks">Greeks</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>
              <TabsContent value="pricePaths">
                <div className="h-80 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" type="number" domain={[0, timeToMaturity]} label={{ value: 'Time (years)', position: 'bottom' }} />
                      <YAxis label={{ value: 'Price', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Legend />
                      {pricePaths.map((path, index) => (
                        <Line key={index} data={path} dataKey="price" stroke={`hsl(${index * 36}, 70%, 50%)`} dot={false} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
              <TabsContent value="optionValue">
                <div className="h-80 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={optionValueDistribution} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="value" label={{ value: 'Option Value', position: 'bottom' }} />
                      <YAxis label={{ value: 'Probability', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="count" stroke="#8884d8" fill="#8884d8" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4">
                  <h3 className="text-lg font-semibold">Probability of Expiring In-The-Money</h3>
                  <p>Call Option: {(probabilityITM.call * 100).toFixed(2)}%</p>
                  <p>Put Option: {(probabilityITM.put * 100).toFixed(2)}%</p>
                </div>
              </TabsContent>
              <TabsContent value="greeks">
                <div className="h-80 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={greeksOverTime} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" label={{ value: 'Time (years)', position: 'bottom' }} />
                      <YAxis label={{ value: 'Greek Value', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="callDelta" name="Call Delta" stroke="#8884d8" />
                      <Line type="monotone" dataKey="putDelta" name="Put Delta" stroke="#82ca9d" />
                      <Line type="monotone" dataKey="gamma" name="Gamma" stroke="#ffc658" />
                      <Line type="monotone" dataKey="theta" name="Theta" stroke="#ff8042" />
                      <Line type="monotone" dataKey="vega" name="Vega" stroke="#ff4d4d" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
              <TabsContent value="advanced">
                <Tabs>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="sensitivity">Sensitivity</TabsTrigger>
                    <TabsTrigger value="strategy">Strategy Payoff</TabsTrigger>
                    <TabsTrigger value="volatilitySmile">Volatility Smile</TabsTrigger>
                  </TabsList>
                  <TabsContent value="sensitivity">
                    <div className="h-80 mb-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sensitivityData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="spot" label={{ value: 'Spot Price', position: 'bottom' }} />
                          <YAxis label={{ value: 'Option Price', angle: -90, position: 'insideLeft' }} />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="call" name="Call Option" stroke="#8884d8" />
                          <Line type="monotone" dataKey="put" name="Put Option" stroke="#82ca9d" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </TabsContent>
                  <TabsContent value="strategy">
                    <div className="h-80 mb-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={strategyPayoff} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="spot" label={{ value: 'Spot Price', position: 'bottom' }} />
                          <YAxis label={{ value: 'Payoff', angle: -90, position: 'insideLeft' }} />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="payoff" name="Strategy Payoff" stroke="#8884d8" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </TabsContent>
                  <TabsContent value="volatilitySmile">
                    <div className="h-80 mb-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                          <CartesianGrid />
                          <XAxis type="number" dataKey="strike" name="Strike Price" label={{ value: 'Strike Price', position: 'bottom' }} />
                          <YAxis type="number" dataKey="impliedVolatility" name="Implied Volatility" label={{ value: 'Implied Volatility', angle: -90, position: 'insideLeft' }} />
                          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                          <Scatter name="Implied Volatility" data={volatilitySmileData} fill="#8884d8" />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}