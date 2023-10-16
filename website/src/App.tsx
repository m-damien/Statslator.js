import React from 'react';
import { Statslator } from 'statslator';
import { GraphicalReport } from './GraphicalReport';


// @ts-ignore
window['Statslator'] = Statslator;

function App() {
  const groupVariables = [
    { name: 'Sample size', key: 'n' },
    { name: 'Sample mean', key: 'mean' },
    { name: 'Sample SD', key: 'SD' },
    { name: 'Sample SE', key: 'SE' },
  ]

  const otherVariables = [
    { name: 'Paired?', key: 'paired', type: 'boolean' },
    { name: 't-score', key: 't-score' },
    { name: 'p-value', key: 'p-value' },
    { name: 'Cohen\'s d', key: 'Cohen d' }
  ]

  const filteredValues = [
    "sample size component",
    "variability component",
    "pooled SD"
  ]

  const examples : {caption: string, input: {[name: string]: number}}[] = [
    { caption: 'p-value & means to 95% CI', input: { 'p-value': 0.05, 'mean1': 5, 'mean2': 8, n1: 12, n2: 12, paired: 0  } },
    { caption: '95% CI to p-value', input: { 'confidence level': 95, 'CI lower': 5, 'CI upper': 10, n1: 12, n2: 12, 'CI 95% lower': 5, 'CI 95% upper': 10, paired: 0 } },
    { caption: 'Individual CIs to p-value', input: { 
      'confidence level1': 95, 'CI lower1': 5, 'CI upper1': 10, 'CI 95% lower1': 5, 'CI 95% upper1': 10, n1: 12,
      'confidence level2': 95, 'CI lower2': 8, 'CI upper2': 12, 'CI 95% lower2': 8, 'CI 95% upper2': 12, n2: 12,
       paired: 0 } },
    { caption: '90% CI to 95% CI', input: { 'confidence level': 90, 'CI lower': 5, 'CI upper': 10, n1: 12, n2: 12, 'CI 90% lower': 5, 'CI 90% upper': 10, paired: 0 } },
  ]

  const [knownVariables, setKnownVariables] = React.useState<{ [name: string]: number }>({ paired: 0, 'confidence level1': 95, 'confidence level2': 95, 'confidence level': 95 })

  const onValuesChanged = () => {
    const newKnownVariables : {[key: string]: number} = {};

    const retrieveFromInput = (key : string) => {
      const input = document.getElementById(key) as HTMLInputElement;
      if (input && input.value !== '') {
        let value = parseFloat(input.value)
        if (input.type === "checkbox") {
          value = input.checked ? 1 : 0;
        }
        newKnownVariables[key] = value;
      }
    }
    for (const groupVariable of groupVariables) {
      for (const groupNumber of [1, 2]) {
        retrieveFromInput(groupVariable.key + groupNumber)
      }
    }

    for (const otherVariable of otherVariables) {
      retrieveFromInput(otherVariable.key)
    }

    // CI are a little different so we need some special code
    for (const cisuffix of ['', '1', '2']) {
      const confidenceLevelInput = document.getElementById("confidence level" + cisuffix) as HTMLInputElement;
      const lowerBoundInput = document.getElementById("CI lower" + cisuffix) as HTMLInputElement;
      const upperBoundInput = document.getElementById("CI upper" + cisuffix) as HTMLInputElement;

      let level = undefined;

      if (confidenceLevelInput && confidenceLevelInput.value !== '') {
        level = confidenceLevelInput.value;
        newKnownVariables["confidence level" + cisuffix] = parseFloat(level);
      }

      if (lowerBoundInput && lowerBoundInput.value !== '') {
        newKnownVariables["CI lower" + cisuffix] = parseFloat(lowerBoundInput.value);
        if (level) newKnownVariables["CI " + level + "% lower" + cisuffix] = parseFloat(lowerBoundInput.value);
      }

      if (upperBoundInput && upperBoundInput.value !== '') {
        newKnownVariables["CI upper" + cisuffix] = parseFloat(upperBoundInput.value);
        if (level) newKnownVariables["CI " + level + "% upper" + cisuffix] = parseFloat(upperBoundInput.value);
      }
      
    }

    setKnownVariables(newKnownVariables)
  }


  const calculatedValues = Statslator.calculate(knownVariables);

  // Convert calculatedValues to a dict with values
  const allStats = {
    ...Object.entries(calculatedValues).reduce((acc, [key, value]) => ({ ...acc, [key]: value.value }), {}),
    ...knownVariables
  }

  const numberInputBoxGenerator = (label: string, key: string, isBoolean = false) =>
  (<div key={label+key} style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
    <label>{label}</label>
    {isBoolean ? <input type="checkbox" id={key} style={{ width: 110 }} checked={knownVariables[key] === 1} onChange={(e) => onValuesChanged()} /> :
      <input type="number" placeholder="Enter a number" id={key} style={{ width: 110 }} value={knownVariables[key] !== undefined ? knownVariables[key] : ''} onChange={(e) => onValuesChanged()} />}

  </div>)


  const CIInputBoxGenerator = (keySuffix: string) => {
    return (
      <div key={keySuffix} style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
        <label><input type="number" placeholder="95" max={99} min={50} id={"confidence level" + keySuffix} style={{ width: 32 }} value={knownVariables["confidence level" + keySuffix] || ''} onChange={() => { onValuesChanged() }} />
          % CI</label>
        <span>

          <input type="number" placeholder="lower" id={"CI lower" + keySuffix} style={{ width: 48 }} value={knownVariables["CI lower" + keySuffix] !== undefined ? knownVariables["CI lower" + keySuffix] : ''} onChange={() => { onValuesChanged() }} />
          <span>, </span>
          <input type="number" placeholder="upper" id={"CI upper" + keySuffix} style={{ width: 48 }} value={knownVariables["CI upper" + keySuffix] !== undefined ? knownVariables["CI upper" + keySuffix] : ''} onChange={() => { onValuesChanged() }} />
        </span>

      </div>
    )
    }



  return (
    <div className="App">
      <header className="App-header">
        <div style={{ maxWidth: 800, margin: 'auto' }}>
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
            <h1>Statslator</h1>
            <span style={{ fontSize: 20 }}>Translate between statistical values</span>
          </div>

          <div id="examples" style={{ display: 'flex', flexDirection: 'row', gap: 10, marginTop: 20, alignItems: 'center' }}>
            <span>Examples:</span>
            <div style={{ display: 'flex', flexDirection: 'row', gap: 10, marginTop: 5 }}>
              {examples.map(example => (
                <button key={example.caption} onClick={() => setKnownVariables(example.input)}>{example.caption}</button>
              ))}
            </div>
          </div>

          <h2 style={{ marginBottom: 3, marginTop: 40 }}>What you know</h2>
          <p style={{marginTop: 0}}>Leave fields blank if you do not know the value</p>


          <div style={{ display: 'flex', flexDirection: 'row', gap: 30, marginTop: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, maxWidth: 230, gap: 5, padding: 5 }}>
              <h3 style={{ marginBottom: 10, marginTop: 0 }}>Group 1</h3>
              {groupVariables.map((variable) => numberInputBoxGenerator(variable.name, variable.key + "1"))}
              {CIInputBoxGenerator("1")}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, maxWidth: 230, gap: 5, padding: 5 }}>
              <h3 style={{ marginBottom: 10, marginTop: 0 }}>Group 2</h3>

              {groupVariables.map((variable) => numberInputBoxGenerator(variable.name, variable.key + "2"))}
              {CIInputBoxGenerator("2")}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, maxWidth: 230, gap: 5, padding: 5 }}>
              <h3 style={{ marginBottom: 10, marginTop: 0 }}>Group 1 - Group 2</h3>

              {otherVariables.map((variable) => numberInputBoxGenerator(variable.name, variable.key, variable.type === 'boolean'))}
              {CIInputBoxGenerator("")}

            </div>
          </div>

          <h2 style={{marginTop: 40, marginBottom: 0}}>What can be calculated</h2>
          {Object.entries(calculatedValues).length === 0 && <div style={{marginTop: 0}}>No values can be calculated with the given inputs</div>}

          <div style={{display: 'flex', flexDirection: 'row', gap: 20}}>
            <div style={{flexGrow: 1}}>
            {Object.entries(calculatedValues).filter(([key, _]) => !filteredValues.includes(key)).map(([key, value], index) => {
            const isInconsistent = Object.entries(value.alternativeCalculations).length > 0

            return (
              <details key={key} style={{ background: index % 2 === 1 ? '#f5f5f5' : '' }}>
                <summary style={{ cursor: 'pointer', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
                  <span>{isInconsistent && <i className="fa fa-exclamation-triangle" aria-hidden="true"></i>} {key}</span>
                  {value.value}
                </summary>
                <div style={{ marginLeft: 10 }}>
                  {value.provenance}
                  {isInconsistent &&
                    <div style={{ marginBottom: 10 }}>Inconsistency detected!
                      <ul style={{ marginTop: 5 }}>
                        {Object.entries(value.alternativeCalculations).map(([key, value]) => (
                          <li>Calculating with {key} gives {value}</li>
                        ))}
                      </ul>
                    </div>}
                </div>
              </details>
            )
          }
          )}
            </div>
            {Object.entries(calculatedValues).length > 0 && <div style={{flexGrow: 1, maxWidth: 400}}><GraphicalReport statVariables={allStats}></GraphicalReport></div>}
          </div>

          <h2 style={{marginTop: 40, marginBottom: 3}}>About</h2>
          <p style={{marginTop: 0}}>Statslator is a tool to <span style={{fontWeight: 600}}>translate between different statistical values</span> such as p-values into confidence intervals, confidence intervals into p-values, confidence intervals at any level into 95% confidence intervals, and calculation of effect sizes. 
          Currently it only supports <span style={{fontWeight: 600}}>t-tests and one-way ANOVAs with two levels</span>.  
          The equations were derived and validated in the <a href={"https://doi.org/10.1145/3586183.3606762"}>associated publication</a>. 
          If you wish to use the calculated values, please refer to it for more details and cite as appropriate:</p>
          <blockquote style={{padding: 1, borderLeft: '5px solid #ccc', background: '#f5f5f5'}}>
            <p style={{marginLeft: 5}}>Damien Masson, Sylvain Malacria, Géry Casiez and Daniel Vogel. 2023. Statslator: Interactive Translation of NHST and Estimation Statistics Reporting Styles in Scientific Documents. In <i>Proceedings of the 36th Annual ACM Symposium on User Interface Software and Technology (UIST '23)</i> <a href={"https://doi.org/10.1145/3586183.3606762"}>https://doi.org/10.1145/3586183.3606762</a></p>
          </blockquote>
        </div>
      </header>
    </div>
  );
}

export default App;
