import React from 'react'
import { Button } from "@/components/ui/button"
import { ChartLineIcon, Dice1Icon, GitForkIcon, Github, Moon, Sun } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Dock, DockIcon } from './magicui/dock'
import Link from 'next/link'
import Image from 'next/image'
import ShinyButton from './magicui/shiny-button'
import ShimmerButton from './magicui/shimmer-button'
import { MultipleOutput } from './MultipleOutput'
import Globe from './Globe'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center space-x-1">
          <ChartLineIcon className="h-5 w-5" />
          <div className="font-bold text-xl">Option Pricing Model</div>
        </div>
        <div className='flex items-center justify-center space-x-1'>
        <Link href="/blackscholes" prefetch={false}>
          <ShinyButton text="Black Scholes" className=""/>
        </Link>
        <Link href="/montecarlo" prefetch={false}>
          <ShinyButton text="Monte Carlo" className=""/>
        </Link>
        <Link href="/binomial" prefetch={false}>
          <ShinyButton text="Binomial Model" className=""/>
        </Link>
        </div>
        <div className="flex items-center space-x-4">
          <Link href='https://github.com/shaikhmubin02/option-pricing-models'>
           <Button variant="outline" className=''>
             <Github className="mr-2 h-4 w-4" />
               Fork
            </Button>
          </Link>
          <div className="relative -mt-9">
            <Dock direction="middle">
              <DockIcon>
                <Link href="https://www.linkedin.com/in/shaikhmubin/">
                  <Image src="/linkedin.png" alt='linkedin' width={20} height={20}/>
                </Link>
              </DockIcon>
              <DockIcon>
                <Link href="https://www.github.com/shaikhmubin02/">
                  <Image src="/github.png" alt='github' width={20} height={20}/>
                </Link>
              </DockIcon>
              <DockIcon>
                <Link href="https://medium.com/@shaikhmubin">
                  <Image src="/medium.png" alt='medium' width={20} height={20}/>
                </Link>
              </DockIcon>
            </Dock>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
          <p className="text-muted-foreground">
            Option pricing models are mathematical models used to calculate the theoretical value of options. 
            These models help traders and investors determine fair prices for options contracts, 
            considering factors such as the underlying asset price, strike price, time to expiration, 
            volatility, and interest rates.
          </p>
        </section>
        
        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Link href='/blackscholes'>
            <Card className='shadow-md'>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChartLineIcon className="h-5 w-5" />
                  Black-Scholes Model
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  The Black-Scholes model is a widely used mathematical model for pricing European-style options. 
                  It assumes that the price of the underlying asset follows a geometric Brownian motion with constant volatility.
                </p>
              </CardContent>
            </Card>
          </Link>
          
          <Link href='/montecarlo'>
            <Card className='shadow-md'>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Dice1Icon className="h-5 w-5" />
                  Monte Carlo Simulation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Monte Carlo simulation is a flexible numerical method that can be used to price various types of options. 
                  It involves simulating multiple random price paths for the underlying asset and averaging the option payoffs.
                </p>
              </CardContent>
            </Card>
          </Link>
          
          <Link href='/binomial'>
            <Card className='shadow-md'>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitForkIcon className="h-5 w-5" />
                  Binomial Model
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  The Binomial model is a simple discrete-time model for option pricing. It assumes that the price of the 
                  underlying asset can only move up or down by a certain amount in each time step, forming a binomial tree.
                </p>
              </CardContent>
            </Card>
          </Link>
        </section>
        <section className="flex justify-center -mb-2 mt-1">
          <MultipleOutput />
        </section>
      </main>
    </div>
  )
}