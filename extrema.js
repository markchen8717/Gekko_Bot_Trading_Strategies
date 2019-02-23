// Strategy Big Picture:
/*
	Given an moving average, locate the local minimum. Buy the dip, and set take profit and stop loss
	base on trade confidence evaluation
	
	What's working so far:
	-Able to get previous ema slope to compare with current ema slope and trigger
	a buy if it forms a local minimum
	-Able to sell when stop loss or take profit is reached



*/

var log = require ('../core/log.js');
var config = require ('../core/util.js').getConfig();
var strat = {};

// Prepare everything our strat needs
strat.init = function() {
	
	this.inTrade = false;
	this.takeProfit = this.settings.take_profit.take_profit;
	this.stopLoss = this.settings.stop_loss.stop_loss;
	this.buyPrice;
	this.prevSlope;
	this.prevEma;
	this.currSlope;
	this.currEma;
	this.addIndicator('myEma', 'EMA', this.settings.EMA.EMA);
	
	this.IShouldBuy = function()
	{
		return (this.prevSlope < 0 && this.currSlope > 0 );
	}
	
	this.TimeToSell = function(candle)
	{
		if((candle.close / this.buyPrice) - 1 >= this.takeProfit/100)
			return true;
		else if (1-(candle.close/ this.buyPrice) >= this.stopLoss/100)
			return true;
	}
	
	this.myDebugger = function(candle)
	{
		console.log("========================");
		console.log("Previous Slope:" + this.prevSlope);
		console.log("Current Slope:" + this.currSlope);
		console.log("Previous EMA:" + this.prevEma);
		console.log("Current EMA:" + this.currEma);
		
		
		
	}
	
}

// What happens on every new candle?
strat.update = function(candle) {
  // update prev slope
  this.prevSlope = this.currSlope;
  // update prev ema
  this.prevEma = this.currEma;
  // calculate new slope
  
   
  
  this.currEma = this.indicators.myEma.result;
  this.currSlope = this.currEma - this.prevEma;
}

// For debugging purposes.
strat.log = function() {
  
}

// Based on the newly calculated
// information, check if we should
// update or not.
strat.check = function(candle) {
	this.myDebugger(candle);
  // your code!
  if(!this.inTrade)
  {
	if(this.IShouldBuy())
	{
		this.advice('long');
		this.buyPrice = candle.close;
		this.inTrade = true;
	}
  }
  else
  {
	  if(this.TimeToSell(candle))
	  {
		  this.advice('short');
		  this.inTrade = false;
	  }
  }
  
}

// Optional for executing code
// after completion of a backtest.
// This block will not execute in
// live use as a live gekko is
// never ending.
strat.end = function() {
  // your code!
}

module.exports = strat;
