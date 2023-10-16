import { StatValue } from "./StatValue";
import { StatEquation } from "./StatEquation";

// @ts-ignore
import jStat from "jstat";

const Aliases : {[name: string]: string} = {
    "standard error1": "SE1",
    "standard error2": "SE2",
    "standard error": "SE",
    "standard deviation": "SD",
    "standard deviation1": "SD1",
    "standard deviation2": "SD2",
    "margin of error": "MoE",
    "margin of error1": "MoE1",
    "margin of error2": "MoE2",
    "confidence interval 95% upper": "CI 95% upper",
    "confidence interval 95% lower": "CI 95% lower",
    "t-value": "t-score",
    "average": "mean",
    "average1": "mean1",
    "average2": "mean2",
    "average difference": "mean difference",
    "dof": "degrees of freedom",
    "Cohen's d": "Cohen d",
    "common language effect size": "CLES",
    "pooled standard deviation": "pooled SD",
    "Cohen's f": "Cohen f",
    "rank biserial correlation": "rpb",
}

class _Statslator {
    equations : {[name: string]: StatEquation[]}

    constructor() {
        this.equations = {};

        const getMatchingVars = (regex : RegExp, variables : {[name: string]: number}) : string[] => {
            const matchingKeys : string[] = [];
            const keys = Object.keys(variables);
            for (const key of keys) {
                if (regex.test(key)) {
                    matchingKeys.push(key);
                }
            }
            return matchingKeys;
        }

        // Helper function to return the CI values no matter its confidence level
        const getAnyCI = (v : {[name: string]: number}, suffix = "") : {lower: number, upper: number, level: number} => {
            const possibleCIs = getMatchingVars(new RegExp("^CI \\d\\d% (upper|lower)"+suffix+"$"), v);
            // Find any CI that has both upper and lower
            for (const CIname of possibleCIs) {
                const otherHalf = CIname.endsWith(" upper") ? CIname.replace(" upper", " lower") : CIname.replace(" lower", " upper")
                if (possibleCIs.includes(otherHalf)) {
                    const match = CIname.match(/^CI (\d\d)% (upper|lower)/)
                    if (match) {
                        const confidence_level = parseInt(match[1])/100
                        const a = v[CIname];
                        const b = v[otherHalf];
    
                        return {lower: Math.min(a, b), upper: Math.max(a, b), level: confidence_level}
                    }
                }
            }

            // This a bit hackish but it makes sure the system is notified that we need the CI but could not find it
            return {lower: v["CI 95% lower"+suffix], upper: v["CI 95% upper"+suffix], level: 0.95}
        }

        // The order defines the priority of the equation
        // So the most accurate ones should come first

        this.register("mean difference", (v) => v['mean2'] - v['mean1']);

        // # Degree of freedom / group size
        this.register("degrees of freedom", (v) => v['paired'] === 1 ? v['n1']-1 : v['n1'] + v['n2'] - 2)
        this.register("n1", (v) => v['paired'] === 1 ? v['degrees of freedom']+1 : v['degrees of freedom'] - v['n2'] + 2)
        this.register("n2", (v) => v['paired'] === 1 ? v['degrees of freedom']+1 : v['degrees of freedom'] - v['n1'] + 2)
        this.register("n1", (v) => v['paired'] === 1 ? v['n2'] : v['n1']) // If paired, n1=n2
        this.register("n2", (v) => v['paired'] === 1 ? v['n1'] : v['n2']) // If paired, n1=n2

        // # Standard error
        this.register("SE1", (v) => v['SD1']/Math.sqrt(v['n1']));
        this.register("SE2", (v) => v['SD2']/Math.sqrt(v['n2']));
        this.register("SE", (v) => (v['mean difference'])/v['t-score'])
        this.register("SE", (v) => (v['variability component'])*v['sample size component'])


        // # Standard deviation
        // Cannot be directly calculated without raw data. Best is to recover it from standard error, or possibly tscore (see equations below, but less reliable)
        this.register("SD", (v) => v['variability component']);

        this.register("SD1", (v) => v['SE1']*Math.sqrt(v['n1']));
        this.register("SD1", (v, params) => (v[`MoE ${params['confidence level']*100}%1`] / jStat.studentt.inv((1 + params['confidence level'])/2., v['n1']-1)) * Math.sqrt(v['n1']));
        
        this.register("SD2", (v) => v['SE2']*Math.sqrt(v['n2']));
        this.register("SD2", (v, params) => (v[`MoE ${params['confidence level']*100}%2`] / jStat.studentt.inv((1 + params['confidence level'])/2., v['n2']-1)) * Math.sqrt(v['n2']));

        // # Confidence Intervals
        this.register("MoE XX%", (v, params) => Math.abs(jStat.studentt.inv((1+params['confidence level'])/2., v['degrees of freedom']) * (v['mean difference'])/v['t-score']));
        this.register("MoE XX%", (v, params) => {
            const CI = getAnyCI(v) // Works for any confidence level
            const moe =  (CI.upper-CI.lower)/2;
            return Math.abs(moe / jStat.studentt.inv((1+CI.level)/2., v['degrees of freedom'])) * jStat.studentt.inv((1+params['confidence level'])/2., v['degrees of freedom'])
        });

        
        this.register("MoE XX%1", (v, params) => (jStat.studentt.inv((1+params['confidence level'])/2., v['n1']-1) * (v['SE1'])));
        this.register("MoE XX%1", (v, params) => {
            const CI = getAnyCI(v, "1") // Works for any confidence level
            const moe =  (CI.upper-CI.lower)/2;
            return (moe / jStat.studentt.inv((1+CI.level)/2., v['n1']-1)) * jStat.studentt.inv((1+params['confidence level'])/2., v['n1']-1)
        });
        
        this.register("MoE XX%2", (v, params) => (jStat.studentt.inv((1+params['confidence level'])/2., v['n2']-1) * (v['SE2'])));
        this.register("MoE XX%2", (v, params) => {
            const CI = getAnyCI(v, "2") // Works for any confidence level
            const moe =  (CI.upper-CI.lower)/2;
            return (moe / jStat.studentt.inv((1+CI.level)/2., v['n2']-1)) * jStat.studentt.inv((1+params['confidence level'])/2., v['n2']-1)
        });

        // This assumes CIs are symmetrical (calculated using normal/t-distribution)
        this.register("mean difference", (v, params) => {
            const CI = getAnyCI(v) // Works for any confidence level
            return (CI.upper-CI.lower)/2+CI.lower
        });

        this.register("CI XX% upper", (v, params) => v["mean difference"]+v["MoE " + params['confidence level']*100 + "%"]);
        this.register("CI XX% lower", (v, params) => v["mean difference"]-v["MoE " + params['confidence level']*100 + "%"]);

        this.register("CI XX% upper1", (v, params) => v["mean1"]+v["MoE " + params['confidence level']*100 + "%1"]);
        this.register("CI XX% lower1", (v, params) => v["mean1"]-v["MoE " + params['confidence level']*100 + "%1"]);

        this.register("CI XX% upper2", (v, params) => v["mean2"]+v["MoE " + params['confidence level']*100 + "%2"]);
        this.register("CI XX% lower2", (v, params) => v["mean2"]-v["MoE " + params['confidence level']*100 + "%2"]);


        this.register("t-score", (v, params) => {
            const CI = getAnyCI(v) // Works for any confidence level
            const talpha = jStat.studentt.inv((1+CI.level)/2., v['degrees of freedom']);
            const moe = (CI.upper-CI.lower)/2.
            return talpha/moe * v['mean difference']
        });

        this.register("mean1", (v, params) => {
            const CI = getAnyCI(v, "1") // Works for any confidence level
            return (CI.upper-CI.lower)/2+CI.lower
        });
        this.register("mean2", (v, params) => {
            const CI = getAnyCI(v, "2") // Works for any confidence level
            return (CI.upper-CI.lower)/2+CI.lower
        }); 

        // # p-value
        this.register("p-value", (v) => (jStat.ttest(v['t-score'], v['degrees of freedom'], 2)))

        // # t-test
        // These equations require redoing a t-test, they should be used as last resort

        // If independent, then we use the pooled standard deviation 
        // If dependent, then we need the average of the difference 
        this.register("variability component", (v) => v['paired'] === 0 ? Math.sqrt((v['SD1'] * v['SD1'] + v['SD2'] * v['SD2'])/2) : v['mean SD difference'])
        this.register("variability component", (v) => (v['mean difference'])/v['t-score']/v['sample size component'])


        // If independent, then sqrt(1/n1 + 1/n2) 
        // If dependent, then 1/sqrt(n1)
        this.register("sample size component", (v) => v['paired'] === 0 ? Math.sqrt(1/v['n1'] + 1/v['n2']) : 1/Math.sqrt(v['n1']))

        // Calculate t-score. Prefer recovering it from p-value to avoid making new assumptions
        this.register("t-score", (v) => jStat.studentt.inv(1 - v['p-value']/2, v['degrees of freedom']))
        this.register("t-score", (v) => Math.abs(v['paired'] === 0 ? v['Cohen d'] / Math.sqrt((1/v['n1']+1/v['n2'])) : v['Cohen d'] * Math.sqrt(v['n2'])))
        this.register("t-score", (v) => (v['mean difference'])/(v['variability component']*v['sample size component']))


        // Effect sizes
        this.register("pooled SD", (v) => 
        Math.sqrt(
                ( ((v['n2']-1)*v['SD2']*v['SD2']) + ((v['n1']-1)*v['SD1']*v['SD1']) )
                /
                (v['n1']+v['n2']-2)
        ));

        this.register("Cohen d", (v) => Math.abs(v['paired'] === 0 ? v['mean difference'] / v['pooled SD'] : (v['mean2']-v['mean1']) / Math.sqrt((v['SD1'] * v['SD1'] + v['SD2'] * v['SD2'])/2)))
        this.register("Cohen d", (v) => Math.abs(v['paired'] === 0 ? v['t-score'] * Math.sqrt((1/v['n1']+1/v['n2'])) : v['t-score'] / Math.sqrt(v['n2'])))
        
        this.register("rpb", (v) => v['Cohen d']/Math.sqrt(v['Cohen d']*v['Cohen d']+4))
        this.register("Cohen f", (v) => v['Cohen d']/2)
        this.register("odds ratio", (v) => Math.exp((v['Cohen d']*Math.PI)/Math.sqrt(3)))
        this.register("CLES", (v) => jStat.normal.cdf(v['Cohen d']/Math.sqrt(2), 0, 1))
        this.register("S-value", (v) => -Math.log2(v['p-value']))
    }

    getEquations(variable : string) : StatEquation[] {
        return this.equations[variable];
    }

    register(value : string, equation : (variables : {[name: string]: number}, parameters : {[name: string]: number}) => number) {
        if (this.equations[value] === undefined) {
            this.equations[value] = [] as StatEquation[];
        }
        this.equations[value].push(new StatEquation(value, equation))
    }

    /**
     * This will try to calculate every value. Returns only the newly created values
     */
    calculate(variables : {[name : string]: number}, confidenceLevel = 0.95) : {[name : string]: StatValue} {
        // Go through each equation to calculate values we do not already have
        // Repeat multiple times until no value is calculated anymore
        let ncalculated = 0;
        const calculated : {[name : string]: StatValue} = {};
        const defaultParams = {'confidence level': confidenceLevel}
        const confLevelStr = (confidenceLevel*100).toString() + "%"

        // Replace the aliases
        const rawVariables : {[name : string]: number} = {};
        for (const [key, value] of Object.entries(variables)) {
            rawVariables[Aliases[key] || key] = value;
        }

        do {
            ncalculated = 0;
            for (const [varName, equations] of Object.entries(this.equations)) {
                for (const equation of equations) {
                    const isCalculable = equation.isCalculable(rawVariables);
                    const needConfLevel =  !isCalculable && equation.isCalculable(rawVariables, defaultParams);

                    if (isCalculable || needConfLevel) {
                        const value = equation.calculate(rawVariables, defaultParams);
                        let variableName = varName;
                        if (needConfLevel) { // We always calculate everything at the specified confidence level
                            variableName = variableName.replace("XX%", confLevelStr)
                        }
                        if (rawVariables[variableName] === undefined) {
                            rawVariables[variableName] = value;
                            calculated[variableName] = new StatValue(value, true, "Calculated from " + [...equation.getMissingTerms().missingVariables].join(", "))
                            ncalculated += 1;
                        } else {
                            // Check consistency
                            const diff = Math.abs(value) - Math.abs(rawVariables[varName])
                            const relative_error = Math.abs(rawVariables[varName] === 0 ? diff : diff/rawVariables[varName])
                            if (relative_error > 0.15) {
                                const variableUsed = equation.getMissingTerms({}, defaultParams).missingVariables
                                const identifier = [...variableUsed].join(", ");

                                // We add it as an alternative calculation
                                const statValue = calculated[variableName] !== undefined ? calculated[variableName] : new StatValue(rawVariables[variableName], false);
                                if (statValue.alternativeCalculations === null) statValue.alternativeCalculations = {};
                                statValue.alternativeCalculations[identifier] = value;
                                calculated[variableName] = statValue;
                            }
                        }
                    }
                }
            }
        } while(ncalculated > 0);

        return calculated;
    }
}


export const Statslator = new _Statslator();