export class StatValue {
    public value: number;
    public calculated: boolean;
    public provenance: string;
    public alternativeCalculations: {[name: string]: number};

    constructor(value: number, calculated = false, provenance = "") {
        this.value = value;
        this.calculated = calculated;
        this.provenance = provenance;
        this.alternativeCalculations = {};
    }
}