//gekko-bot lstm nn strat using the js synaptic library
/*
This is a Gekko trading bot strategy implemented using a LSTM RNN from the JS Synaptic library.

Instructions:

Install Synaptic at https://github.com/cazala/synaptic
Move the strategy file into your strategies folder in your Gekko directory
Read the comments in the strategy file for further details
*/
var _ = require('lodash');
var fs = require('fs');
var synaptic = require('synaptic'); 
var log = require('../core/log');
var Neuron = synaptic.Neuron,
	Layer = synaptic.Layer,
	Network = synaptic.Network,
	Trainer = synaptic.Trainer,
	Architect = synaptic.Architect;

// Let's create our own strat
var strat = {};




// Prepare everything our method needs
strat.init = function() {
	
	//requiredHisotry
	this.requiredHistory = 30;
	this.historyCount = 0;
	
	//rsi indicator and states
	this.addTalibIndicator('myrsi','rsi', {optInTimePeriod: 14});
	this.smoothK = 3;
	this.smoothD = 3;
	this.lengthRSI = 14;
	this.lengthStoch = 14;	
	this.StochRsiB;
	this.StochRsiO; 
	this.myrsi;
	this.StochRsi;
	this.lowestRSI;
	this.highestRSI;
	this.RSIhistory = [];
	this.StochRSIhistory = [];
	this.StochRSI_B_history =[];
	
	//macd indicator
  	var customMACDSettings = {
    optInFastPeriod: 9,
    optInSlowPeriod: 15,
    optInSignalPeriod: 9
  }
  this.addTalibIndicator('mymacd', 'macd', customMACDSettings);
  this.macdB ;
	this.macdO ;
	
	
	
	// change this to "this.myLSTM;" only after first run, and remeber to uncomment import nn in the check function down below
	this.myLSTM = new Architect.LSTM(9,12,1);
	
	this.lastClosingPrice;
	this.lastMax;
	this.lastMin;
	this.lastVolume;
	this.lastTrades;
	this.lastMACDB;
	this.lastMACDO;
	this.lastRSIO;
	this.lastRSIB;
	this.nnSwitch = false;
	this.divisor = 100000;
	this.trend;

	this.trainNN = function()
	{
		
		
		
		var trainer = new Trainer(this.myLSTM);
		var trainingSet = [
		  {
			input: [this.lastClosingPrice/this.divisor,
			this.lastMax/this.divisor,
			this.lastMin/this.divisor,
			this.lastOpen/this.divisor,
			//this.lastVolume/this.divisor,
			this.lastTrades/this.divisor,
			this.lastMACDB/100,
			this.lastMACDO/100,
			this.lastRSIB/100,
			this.lastRSIO/100],
			output: [this.candle.close/this.divisor] 
		  }
		]		
	
		trainer.train(trainingSet);
	}
	
	this.importNN = function ()
	{
		var rawdata = fs.readFileSync('lstm_macd_rsi_v3.json'); 
		var procData = JSON.parse(rawdata); 
		this.myLSTM = Network.fromJSON(procData);	
	}

this.updateNNData = function  ()
{
	
	this.lastClosingPrice =  this.candle.close;
	this.lastMax = this.candle.high;
	this.lastMin = this.candle.low;
	this.lastOpen = this.candle.open;
	//this.lastVolume = this.candle.volume;
	this.lastTrades = this.candle.trades;
	this.lastMACDB = this.macdB;
	this.lastMACDO = this.macdO;
	this.lastRSIB = this.StochRsiB;
	this.lastRSIO = this.StochRsiO;
	
}

//returns prediction
this.activateNN = function ()
{
	var output = this.myLSTM.activate(
		[this.candle.close/this.divisor,
			this.candle.high/this.divisor,
			this.candle.low/this.divisor,
			this.candle.open/this.divisor,
			//this.candle.volume/this.divisor,
			this.candle.trades/this.divisor,			
			this.macdB/100,
			this.macdO/100,
			this.StochRsiB/100,
			this.StochRsiO/100]);
	
	
	return output*this.divisor;
}

	
	
	
}



// What happens on every new candle?
strat.update = function(candle) {
	
	
	//update rsi history
	this.myrsi = this.talibIndicators.myrsi.result['outReal'];
	this.RSIhistory.push(this.myrsi);
	if(_.size(this.RSIhistory) > this.lengthStoch)
	{
		// remove oldest RSI value
		this.RSIhistory.shift();
	}

	//update rsi max & min
	this.lowestRSI = _.min(this.RSIhistory);
	this.highestRSI = _.max(this.RSIhistory);
	//log.debug("lowestRSI: "+ this.lowestRSI);
	//log.debug("highestRSI: " +this.highestRSI);
	
	//update stochRsi
	this.StochRsi = 100 * (this.myrsi - this.lowestRSI) / (this.highestRSI - this.lowestRSI);
	//log.debug("StochRsi: " +this.StochRsi);
	
	//update stochRsi history
	this.StochRSIhistory.push(this.StochRsi);
	if(_.size(this.StochRSIhistory) > this.smoothK)
	{
		// remove oldest StochRSI value
		this.StochRSIhistory.shift();
	}
	
	//update stochRsi K & D
	var total=0;
	for( i in this.StochRSIhistory) { total += this.StochRSIhistory[i]; }
	this.StochRsiB = total/this.smoothK;
	//log.debug("StochRsiB: " +this.StochRsiB);
	this.StochRSI_B_history.push(this.StochRsiB);
	if(_.size(this.StochRSI_B_history) > this.smoothD)
	{
		// remove oldest StochRSI_B value
		this.StochRSI_B_history.shift();
	}
	total=0;
	for(i in this.StochRSI_B_history) { total += this.StochRSI_B_history[i]; }
	this.StochRsiO = total/this.smoothD;
	
	//update macd
	var macdResult = this.talibIndicators.mymacd.result;
	this.macdB = macdResult['outMACD'];
	this.macdO = macdResult['outMACDSignal'];
	
	
	if(this.historyCount < this.requiredHistory-1)
	{
	
		this.updateNNData();
		this.historyCount++;
	}



}


// For debugging purposes.
strat.log = function() {

}

// Based on the newly calculated
// information, check if we should
// update or not.
strat.check = function() {
	
	
	//import nn
	//this.importNN();
	
	
	//first prediction
	if(!this.nnSwitch)
	{		
		log.debug("Prediction: " + this.activateNN());
		this.nnSwitch = true;
		this.trend = "short";
	}

	if(this.nnSwitch)
	{					
		
		log.debug("Actual: " + this.candle.close);
		log.debug("================================");
		this.trainNN();
		var prediction = this.activateNN();
		log.debug("Prediction: " + prediction);
		if(prediction > this.candle.close && this.trend != "long")
		{
			this.trend = "long";
			this.advice('long');
		}
		else if (prediction < this.candle.close && this.trend != "short")
		{
			this.trend = "short";
			this.advice('short');
		}
		
	}
	
	//save nn
		var exported = this.myLSTM.toJSON();
		var data = JSON.stringify(exported, null, 2);
		fs.writeFileSync('lstm_macd_rsi_v3.json', data);
		
	
	this.updateNNData();	
	

}

module.exports = strat;
