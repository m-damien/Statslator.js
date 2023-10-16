import { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
// @ts-ignore
import jStat from "jstat";
import { ExplorableText } from './ExplorableText';

export const GraphicalReport = (props: {statVariables : {[name : string]: number}}) => {

    // Configuration of the graphical report
    const [chartType, setChartType] = useState("dot plot");
    const [valueType, setValueType] = useState("mean difference");
    const [errorBarType, setErrorBarType] = useState("95% CI");
    const [counter, setCounter] = useState(0);


    const categories = [];
    const dataPoints = [];
    const dataIntervals = [];
    let minPossibleValue = 0;
    let maxPossibleValue = 0;

    const nameToValue : {[name: string] : string} = {
        '95% CI': 'MoE 95%',
        'standard error': 'SE',
        'standard deviation': 'SD'
    }

    const randomSampleFromTDisitribution = (mean : number, std: number, df : number) => {
        if (df) {
            let t = jStat.studentt.sample(df);
            return mean + t * std;
        }
        // If df is unknown, we use normal distribution
        return jStat.normal.sample(mean, std);
    }


    // The value decides if the we should use per condition or per comparison
    if (valueType === "mean difference") {
        categories.push("Group 1 - Group 2")
        let value = props.statVariables['mean difference'];
        minPossibleValue = value-props.statVariables['SD']*2;
        maxPossibleValue = value+props.statVariables['SD']*2;
        if (chartType === "hypothetical outcome plot") {
            value = randomSampleFromTDisitribution(props.statVariables['mean difference'], props.statVariables['SD'], props.statVariables['degrees of freedom'])
        }
        const intervalValue = props.statVariables[nameToValue[errorBarType]]
        dataIntervals.push([value-intervalValue, value+intervalValue])
        dataPoints.push(value)
    } else {
        categories.push("Group 1")
        let value = props.statVariables['mean1']
        minPossibleValue = value-props.statVariables['SD1']*2;
        maxPossibleValue = value+props.statVariables['SD2']*2;
        if (chartType === "hypothetical outcome plot") {
            value = randomSampleFromTDisitribution(props.statVariables['mean1'], props.statVariables['SD1'], props.statVariables['n1']-1)
        }
        let intervalValue = props.statVariables[nameToValue[errorBarType]+"1"]
        dataIntervals.push([value-intervalValue, value+intervalValue])
        dataPoints.push(value)


        categories.push("Group 2")
        value = props.statVariables['mean2']
        minPossibleValue = Math.min(minPossibleValue, value-props.statVariables['SD2']*2);
        maxPossibleValue = Math.max(maxPossibleValue, value+props.statVariables['SD2']*2);
        if (chartType === "hypothetical outcome plot") {
            value = randomSampleFromTDisitribution(props.statVariables['mean2'], props.statVariables['SD2'], props.statVariables['n2']-1)
        }
        intervalValue = props.statVariables[nameToValue[errorBarType]+"2"]
        dataIntervals.push([value-intervalValue, value+intervalValue])
        dataPoints.push(value)
    }

    const allPoints = dataIntervals.flat().concat(dataPoints);


    const getEchartErrorBarSeries = (data : any) => {
        return {
            type: 'custom',
            tooltip: {
                trigger: 'item'
            },
            itemStyle: {
                borderWidth: 1.5
            },
            renderItem: function (params : any, api : any) { // Error bars not supported by ECharts by default so we need to write our own renderer
                const isHorizontal = true;
                const associatedSeriesId = (params.seriesIndex - 1) / 2; // TODO: Find a more robust way to link
                const currentSeriesIndices = api.currentSeriesIndices();

                if (!currentSeriesIndices.includes(associatedSeriesId)) { // Only draw error bars if the associated series is currently visible
                    return { type: 'group', children: [], data: [] };
                }

                const barLayout = api.barLayout({
                    barGap: '0%',
                    barCategoryGap: '20%',
                    count: currentSeriesIndices.length / 2
                });

                const xValue = params.dataIndex;
                const highPoint = api.coord(isHorizontal ? [api.value(0), xValue] : [xValue, api.value(0)]);
                const lowPoint = api.coord(isHorizontal ? [api.value(1), xValue] : [xValue, api.value(1)]);
                const offset = barLayout[associatedSeriesId].offsetCenter
                const offsetx = isHorizontal ? 0 : offset;
                const offsety = isHorizontal ? offset : 0;

                const barShape = {
                    x1: highPoint[0] + offsetx, y1: highPoint[1] + offsety,
                    x2: lowPoint[0] + offsetx, y2: lowPoint[1] + offsety
                }

                const style = {
                    stroke: '#333333',
                    fill: undefined
                };
                return {
                    type: 'group',
                    children: [
                        {
                            type: 'line',
                            transition: ['shape', 'style', 'x', 'y'],
                            shape: barShape,
                            style: style,
                            enterFrom: { shape: { x2: (barShape as any).x1, y1: (barShape as any).y2 } }
                        }
                    ]
                };
            },
            data: data,
            z: 100,
            encode: {
                tooltip: [1, 2]
            }
        }
    }

    useEffect(() => {
        const interval = setInterval(() => {
            setCounter((v) => v+1)
        }, 1000);
        return () => clearInterval(interval);
      }, []);


    const series = [{
        data: dataPoints,
        type: chartType === "bar chart" ? 'bar' : "scatter"
    }]


    const validPoints = allPoints.filter(v => !isNaN(v));
    let minX = Math.min(minPossibleValue, ...validPoints) || Math.min(...validPoints) - Math.min(...validPoints)*0.1;
    let maxX = Math.max(maxPossibleValue, ...validPoints) || Math.max(...validPoints) + Math.max(...validPoints)*0.1;

    // if mean difference, need to make sure that 0 is included
    if (valueType === "mean difference") {
        minX = Math.min(minX, 0);
        maxX = Math.max(maxX, 0);
    }
    
    if (chartType !== "hypothetical outcome plot") {
        // Error bars only for charts that are not HOPs
        series.push(getEchartErrorBarSeries(dataIntervals.map(v => ({value: v}))))
    }

    return (
        <div>
            <ReactECharts notMerge={true}  style={{/* width: width,*/ height: 50*categories.length }} option={{
                animationDurationUpdate: 200,
                grid: { top: 20, right: 1, bottom: 0, left: 0, containLabel: true },
                tooltip: { trigger: 'item' },
                xAxis: {
                    type: 'value',
                    min: minX,
                    max: maxX
                },
                yAxis: {
                    type: 'category',
                    data: categories,
                },
                series: series
            }} />

            <p className="m-0" style={{ marginTop: 5, fontWeight: 800, textAlign: 'left' }}>
                Figure: <ExplorableText onOptionChanged={(id, name) => setChartType(name.toLowerCase())} options={['Dot plot', 'Bar chart', 'Hypothetical Outcome Plot']} /> of 
                the <ExplorableText isBroken={dataPoints.some(v => v === undefined)} onOptionChanged={(id, name) => setValueType(name.toLowerCase())} options={['mean difference', 'mean']} />.
                { chartType !== "hypothetical outcome plot" && <> Error bars represent the <ExplorableText  isBroken={dataIntervals.flat().some(v => isNaN(v) || v === undefined)} onOptionChanged={(id, name) => setErrorBarType(name)} options={['95% CI', 'standard error', 'standard deviation']} />.</>}
            </p>
            <div style={{display: 'none'}}>{counter}</div>
        </div>
    );
}
