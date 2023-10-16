# Statslator.js
A library to translate between statistical values such as converting p-values and means to confidence intervals, converting confidence intervals to p-values, changing the confidence level of a CI, calculating effect sizes, and converting effect sizes to p-values. Currently **only tested with t-tests and one-way ANOVAs with two levels**.

Statslator.js works by iteratively calculating as many possible statistical values given limited available information about a statistical test. Statslator.js can also detect inconsistencies whenever a value can be calculated in multiple ways but these different calculations yield different results.

[Online Playground](https://m-damien.github.io/Statslator.js) / [Examples](#examples) / [API](#api) / [Publication](#publication)


## Installation
```
npm install statslator
```

## Examples

First, fill a dictionary with all known statistics. For example,
```js
const input = {
    'n1': 12, 
    'SD1': 1.9275045071934906, 
    'mean1': 1.4964247976, 
    'CI 95% lower1': 0.2717468615096086, 
    'CI 95% upper1': 2.7211027336277915, 
    'MoE 95%1': 1.2246779360590914, 
    'n2': 12, 
    'SD2': 2.444904349182528, 
    'mean2': 1.1176643802, 
    'CI 95% lower2': -0.43575373167355447, 
    'CI 95% upper2': 2.6710824921010268, 
    'MoE 95%2': 1.5534181118872907, 
    't-score': -0.4214343115948076,
    'paired': 0
}
```

All fields are filled for the example. In practice, it might very well be that only some fields are known such as:
```js
const input = {
    'n1': 12, 
    'mean1': 1.5, 
    'n2': 12, 
    'mean2': 1.12, 
    't-score': -0.42,
    'paired': 0
}
```
Note: the "1" or "2" indicates the value is for either Group1 or Group2. All CIs (confidence intervals) are CIs on the mean (or mean difference if not suffixed with 1 or 2). They can be specified at any confidence level.

Then, run Statslator to calculate all possible values from the input. Under the hood, the library will iteratively try all possible conversations to obtains, if possible, the CIs, p-values, and other effect sizes such as Cohen's d
```js
const calculated = Statslator.calculate(input)
```

The returned value is a dictionary of type ``{[name : string]: StatValue}`` containing all values that could be calculated from the input. For example, you can retrieve the calculated 95% CI like this
```js
const ci_lower = calculated['CI 95% lower'].value
const ci_upper = calculated['CI 95% upper'].value
```
You can also retrieve the exact equation that was used to calculate the variable using "provenance"
```js
console.log(calculated['MoE 95%'].provenance);
```

Finally, in case multiple equations can calculate the variable but yield different results, you can review these alternative equations and their results by accessing "alternativeCalculations" such as:
```js
const alternatives = calculated['MoE 95%'].alternativeCalculations;
```
This returns a dictionary of type ``{[name: string]: number}`` corresponding of the name of the equation and the correspond value calculated from it

### p-value and means to CI
Assuming a report such as *"12 participants used a mouse (group 1), and 12 participants used a trackball (group 2) to select targets on a computer screen. Group 1 was significantly faster than group 2 (M=7s vs. M=10, p=0.029)."* The corresponding CI on the mean difference can recovered as follows.
```js
const input = {
    'n1': 12, 
    'n2': 12,  
    'paired': 0,
    'mean1': 7,
    'mean2': 10,
    'p-value': 0.029
}
const calculated = Statslator.calculate(input)

console.log(calculated['CI 95% lower'].value) // ~0.34
console.log(calculated['CI 95% upper'].value) // ~5.66
```


### CI to p-value
Assuming a report such as *"12 participants used a mouse (group 1), and 12 participants used a trackball (group 2) to select targets on a computer screen. The estimated difference betwen group means was 3 seconds (95% CI [0.34, 5.67])"*, recovering the corresponding p-value is done as follows.
```js
const input = {
    'n1': 12, 
    'n2': 12,  
    'paired': 0,
    'CI 95% lower': 0.34,
    'CI 95% upper': 5.67
}
const calculated = Statslator.calculate(input)

console.log(calculated['p-value'].value) // ~0.029
```

### Individual CIs to p-value
If, instead, the report includes the CI on the mean of each group such as *"12 participants used a mouse (group 1), and 12 participants used a trackball (group 2) to select targets on a computer screen. Group 1 was slightly faster (95% CI [5, 9]) than group 2  (95% CI [8, 12])"*, recovering the corresponding p-value is done as follows.
```js
const input = {
    'n1': 12, 
    'n2': 12,  
    'paired': 0,
    'CI 95% lower1': 5,
    'CI 95% upper1': 9,
    'CI 95% lower2': 8,
    'CI 95% upper2': 12
}
const calculated = Statslator.calculate(input)

console.log(calculated['p-value'].value) // ~0.029
```

### 90% CI to 99% CI
```js
const input = {
    'n1': 12, 
    'n2': 12,  
    'paired': 0,
    'CI 90% lower': -10,
    'CI 90% upper': 10
}
const calculated = Statslator.calculate(input, confidenceLevel=0.99)

console.log(calculated['CI 99% lower'].value) // ~-16.4
console.log(calculated['CI 99% upper'].value) // ~16.4
```

### Cohen's d to p-value
```js
const input = {
    'n1': 12, 
    'n2': 12,  
    'paired': 0,
    'Cohen d': 0.953
}
const calculated = Statslator.calculate(input)

console.log(calculated['p-value'].value) // ~0.029
```


### Detecting inconsistencies
Whenever values specified in the input do not match (i.e., some calculations lead to different resutls), Statslator reports these inconsistencies. For example, if the t-score does not match the p-value, Statslator will return the alternative calculation for the p-value as follows.
```js
const input = {
    'n1': 12, 
    'n2': 12,  
    'paired': 0,
    't-score': 2,
    'p-value': 0.029
}
const calculated = Statslator.calculate(input)

for (const [variablesUsed, valueCalculated] of Object.entries(calculated['p-value'].alternativeCalculations)) {
    console.log('Inconsistency detected')
    console.log("p-value = " + valueCalculated + " when using " + variablesUsed)
}
```

## API

### Statslator

**\#** Statslator.**calculate**(variables : {[name : string]: number}, confidenceLevel = 0.95)\
=> Returns:  {[name : string]: [StatValue](#statvalue)}

Iteratively calculates all possible statistical values given limited available information about a statistical test. By default, confidence intervals are calculated at the confidence level of 95%. The confidence level can be changed by specifying the confidenceLevel parameter.

**\#** Statslator.**getEquations**(variable : string)\
=> Returns:  {[name : string]: [StatEquation](#equation)}

Returns all equations that can be used to calculate the given variable. 

### StatValue

**\#** statvalue.**value**\
=> number

The value of the statistical variable

**\#** statvalue.**provenance**\
=> string

The variables used to calculate the value

**\#** statvalue.**alternativeCalculations**\
=> {[name: string]: number}

The alternative calculations that could be used to calculate the value. This object should be empty if there are no inconsistencies in the input for the given variable.

### StatEquation

**\#** statequation.**name**\
=> string

Name the of the variable that the equation calculates

**\#** statequation.**calculate**(variables : {[name: string]: number}, parameters : {[name: string]: number}?)\
=> number

Calculates the value of the variable given the variables and parameters. The variables and parameters are specified as a dictionary of type ``{[name: string]: number}``. The variables are the values that are known about the statistical test. The parameters are currently used only to specifiy the `confidence level`, if needed by the equation (e.g., for calculating CIs).

**\#** statequation.**getMissingTerms**(variables : {[name: string]: number}, parameters : {[name: string]: number}?)\
=> {missingVariables: Set<string>, missingParameters: Set<string>}

Returns the missing variables and parameters needed to calculate the variable. The variables and parameters are specified as a dictionary of type ``{[name: string]: number}``. The variables are the values that are known about the statistical test. The parameters are currently used only to specifiy the `confidence level`, if needed by the equation (e.g., for calculating CIs).

**\#** statequation.**isCalculable**(variables : {[name: string]: number}, parameters : {[name: string]: number}?)\
=> boolean

Returns true if the equation can be used to calculate the variable given the variables and parameters. The variables and parameters are specified as a dictionary of type ``{[name: string]: number}``. The variables are the values that are known about the statistical test. The parameters are currently used only to specifiy the `confidence level`, if needed by the equation (e.g., for calculating CIs).



## Publication
The equations used in Statslator.js were partly derived and validated in the publication below. If you use Statslator.js, please cite the following paper:
> Damien Masson, Sylvain Malacria, Géry Casiez and Daniel Vogel. 2023. Statslator: Interactive Translation of NHST and Estimation Statistics Reporting Styles in Scientific Documents. In Proceedings of the 36th Annual ACM Symposium on User Interface Software and Technology (UIST '23) [https://doi.org/10.1145/3586183.3606762](https://doi.org/10.1145/3586183.3606762)