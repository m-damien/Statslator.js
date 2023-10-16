export class StatEquation {
    name : string;
    equation : (variables : {[name: string]: number}, parameters : {[name: string]: number}) => number;

    constructor(name : string, equation : (variables : {[name: string]: number}, parameters : {[name: string]: number}) => number) {
        this.name = name;
        this.equation = equation;
    }

    calculate(variables : {[name: string]: number}, parameters : {[name: string]: number}) : number {
        // TODO: Make sure it can be calculated
        return this.equation(variables, parameters)
    }

    getMissingTerms(variables : {[name: string]: number} = {}, parameters : {[name: string]: number} = {}) : {missingVariables: Set<string>, missingParameters: Set<string>} {
        const missingVariables = new Set<string>();
        const missingParameters = new Set<string>();

        // Find all variables necessary to calculate this equation
        const varProxy = new Proxy(variables, {
            get(target, prop : string, receiver) {
                if (variables[prop] === undefined) {
                    missingVariables.add(prop);
                    return Math.random()+1; // Just to make sure we can process the equation without errors
                }
                return variables[prop];
            }
        })

        const paramProxy = new Proxy(parameters, {
            get(target, prop : string, receiver) {
                if (parameters[prop] === undefined) {
                    missingParameters.add(prop);
                    return Math.random()+1; // Just to make sure we can process the equation without errors
                }
                return parameters[prop];
            }
        })

        this.equation(varProxy, paramProxy)

        return {missingVariables: missingVariables, missingParameters: missingParameters}
    }

    isCalculable(variables : {[name: string]: number}, parameters : {[name: string]: number} = {}) : boolean {
        const missingTerms = this.getMissingTerms(variables, parameters);
        return missingTerms.missingVariables.size === 0 && missingTerms.missingParameters.size === 0;
    }
}