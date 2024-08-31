'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Menu, ChevronUp, ChevronDown, MinusIcon, PlusIcon } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dock, DockIcon } from './magicui/dock'
import Link from 'next/link'
import Image from 'next/image'
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface NodeProps {
  value: number
  stockPrice: number
  depth: number
  maxDepth: number
  maxValue: number
  isCall: boolean
}

const Node: React.FC<NodeProps> = ({ value, stockPrice, depth, maxDepth, maxValue, isCall }) => {
  const size = Math.max(50, 90 - depth * 8)
  const intensity = (value / maxValue) * 100
  const backgroundColor = isCall 
    ? `hsl(120, 100%, ${100 - intensity}%)`
    : `hsl(0, 100%, ${100 - intensity}%)`

  return (
    <div className="flex flex-col items-center">
      <div 
        className="rounded-lg text-primary-foreground flex flex-col items-center justify-center mb-2 text-xs p-1"
        style={{ width: size, height: size, backgroundColor }}
      >
        <div className="text-[10px]">{stockPrice.toFixed(2)}</div>
        <div>{value.toFixed(2)}</div>
      </div>
      {depth < maxDepth && (
        <div className="flex justify-between w-full">
          <Node value={value * 1.1} stockPrice={stockPrice * 1.1} depth={depth + 1} maxDepth={maxDepth} maxValue={maxValue} isCall={isCall} />
          <Node value={value * 0.9} stockPrice={stockPrice * 0.9} depth={depth + 1} maxDepth={maxDepth} maxValue={maxValue} isCall={isCall} />
        </div>
      )}
    </div>
  )
}

export default function EnhancedBinomialOptionPricingModel() {
  const [stockPrice, setStockPrice] = useState(100)
  const [strikePrice, setStrikePrice] = useState(100)
  const [riskFreeRate, setRiskFreeRate] = useState(0.05)
  const [volatility, setVolatility] = useState(0.2)
  const [timeToExpiration, setTimeToExpiration] = useState(1)
  const [steps, setSteps] = useState(3)
  const [callPrice, setCallPrice] = useState<number | null>(null)
  const [putPrice, setPutPrice] = useState<number | null>(null)
  const [optionValues, setOptionValues] = useState<{ call: number[][], put: number[][] }>({ call: [], put: [] })
  const [chartData, setChartData] = useState<{ step: number; call: number; put: number }[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isAmerican, setIsAmerican] = useState(false)
  const [greeks, setGreeks] = useState({ delta: null, gamma: null, theta: null, vega: null })

  const calculateOptionPrices = async () => {
    const response = await fetch('http://127.0.0.1:8000/calculate_option_prices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stock_price: stockPrice,
        strike_price: strikePrice,
        risk_free_rate: riskFreeRate,
        volatility: volatility,
        time_to_expiration: timeToExpiration,
        steps: steps,
        is_american: isAmerican,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      setCallPrice(data.call_price)
      setPutPrice(data.put_price)
      setOptionValues({ call: data.call_tree, put: data.put_tree })
      setGreeks(data.greeks)

      const newChartData = data.call_tree.map((value, index) => ({
        step: index,
        call: value[0],
        put: data.put_tree[index][0],
      }))
      setChartData(newChartData)
    } else {
      console.error('Failed to fetch option prices')
    }
  }

  const adjustValue = (setter: React.Dispatch<React.SetStateAction<number>>, value: number, increment: number) => {
    setter(prevValue => Math.max(0, Number((prevValue + increment).toFixed(2))))
  }

  const ParameterControl = ({ label, value, setValue, step = 0.01, minValue = 0 }) => (
    <div className="flex flex-col space-y-2">
      <Label htmlFor={label} className="text-sm font-medium">{label}:</Label>
      <div className="flex items-center space-x-2">
        <div className="flex-grow">
          <Input
            id={label}
            type="number"
            value={value}
            onChange={(e) => setValue(Math.max(minValue, Number(e.target.value)))}
            className="w-full"
            step={step}
          />
        </div>
        <div className="flex space-x-1">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => adjustValue(setValue, value, -step)}
            disabled={value <= minValue}
          >
            <MinusIcon className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => adjustValue(setValue, value, step)}
          >
            <PlusIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-background">
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 ease-in-out overflow-hidden bg-secondary`}>
        <div className="p-4 space-y-4">
          <h2 className="text-lg font-semibold pt-6">Model Parameters</h2>
          <Button onClick={calculateOptionPrices} className="">Run Model</Button>
          <ParameterControl label="Stock Price" value={stockPrice} setValue={setStockPrice} step={0.01} minValue={0.1} />
          <ParameterControl label="Strike Price" value={strikePrice} setValue={setStrikePrice} step={0.01} minValue={0.1} />
          <ParameterControl label="Risk-Free Rate" value={riskFreeRate} setValue={setRiskFreeRate} />
          <ParameterControl label="Volatility" value={volatility} setValue={setVolatility} />
          <ParameterControl label="Time to Expiration" value={timeToExpiration} setValue={setTimeToExpiration} step={0.1} minValue={0.1} />
          <ParameterControl label="Steps" value={steps} setValue={setSteps} step={1} minValue={1} />
          <div className="flex items-center space-x-2">
            <Switch id="american-option" checked={isAmerican} onCheckedChange={setIsAmerican} />
            <Label htmlFor="american-option">American Option</Label>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">Binomial Option Pricing Model Visualizer</h1>
            <div className='flex justify-between p-3'>
              <div className="relative -mt-8">
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
              <Button variant="outline" size="icon" className='ml-2' onClick={() => setSidebarOpen(!sidebarOpen)}>
                <Menu className="h-4 w-4" />
                <span className="sr-only">Toggle sidebar</span>
              </Button>
            </div>
          </div>
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Model Parameters and Option Prices</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stock Price</TableHead>
                    <TableHead>Strike Price</TableHead>
                    <TableHead>Risk-Free Rate</TableHead>
                    <TableHead>Volatility</TableHead>
                    <TableHead>Time to Expiration</TableHead>
                    <TableHead>Steps</TableHead>
                    <TableHead>Call Price</TableHead>
                    <TableHead>Put Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>{stockPrice.toFixed(2)}</TableCell>
                    <TableCell>{strikePrice.toFixed(2)}</TableCell>
                    <TableCell>{(riskFreeRate * 100).toFixed(2)}%</TableCell>
                    <TableCell>{(volatility * 100).toFixed(2)}%</TableCell>
                    <TableCell>{timeToExpiration.toFixed(2)} years</TableCell>
                    <TableCell>{steps}</TableCell>
                    <TableCell className="font-bold text-green-500">{callPrice !== null ? `$${callPrice.toFixed(2)}` : '-'}</TableCell>
                    <TableCell className="font-bold text-red-500">{putPrice !== null ? `$${putPrice.toFixed(2)}` : '-'}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Greeks</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Delta</TableHead>
                    <TableHead>Gamma</TableHead>
                    <TableHead>Theta</TableHead>
                    <TableHead>Vega</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>{greeks.delta !== null ? greeks.delta.toFixed(4) : '-'}</TableCell>
                    <TableCell>{greeks.gamma !== null ? greeks.gamma.toFixed(4) : '-'}</TableCell>
                    <TableCell>{greeks.theta !== null ? greeks.theta.toFixed(4) : '-'}</TableCell>
                    <TableCell>{greeks.vega !== null ? greeks.vega.toFixed(4) : '-'}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Call Option</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="tree">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="tree">Option Tree</TabsTrigger>
                    <TabsTrigger value="chart">Price Evolution</TabsTrigger>
                  </TabsList>
                  <TabsContent value="tree" className="overflow-x-auto">
                    <div className="min-w-[300px] min-h-[300px]">
                      {callPrice !== null && (
                        <Node value={callPrice} stockPrice={stockPrice} depth={0} maxDepth={steps} maxValue={Math.max(...optionValues.call.flat())} isCall={true} />
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent value="chart">
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="step" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="call" stroke="#22c55e" name="Call Option" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Put Option</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="tree">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="tree">Option Tree</TabsTrigger>
                    <TabsTrigger value="chart">Price Evolution</TabsTrigger>
                  </TabsList>
                  <TabsContent value="tree" className="overflow-x-auto">
                    <div className="min-w-[300px] min-h-[300px]">
                      {putPrice !== null && (
                        <Node value={putPrice} stockPrice={stockPrice} depth={0} maxDepth={steps} maxValue={Math.max(...optionValues.put.flat())} isCall={false} />
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent value="chart">
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="step" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="put" stroke="#ef4444" name="Put Option" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}