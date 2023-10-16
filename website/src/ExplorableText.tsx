import { useState } from 'react';

/**
 * Defines a bunch of text annotations that will overlay the text
 */
export const ExplorableText = ({options, onOptionChanged = undefined, isBroken = false, value = 0} : {options : string[], tooltipText? : string, value? : number, onOptionChanged? : (id : number, optionName : string) => void, isBroken? : boolean})  => {
    const [optionId, setOptionId] = useState(value);
    const color = isBroken ? '#b90e0a' : '#46f';

    return (<span onClick={() => {
        const newId = (optionId + 1) % options.length;
        setOptionId(newId);
        if (onOptionChanged) {
            onOptionChanged(newId, options[newId]);
        }
    }
    } style={{color: color, borderBottom: '1px dashed ' + color, cursor: 'pointer'}} className='explorableText'>{options[optionId]}</span>
    );
}
