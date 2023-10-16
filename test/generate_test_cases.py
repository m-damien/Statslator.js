import numpy as np
import math
import numpy as np, scipy.stats as st
import pingouin as pg
import random


random.seed(0)
np.random.seed(0)

NDECIMALS = 10


class NormalPopulation:
    def __init__(self, mean, sd):
        self.mean = mean
        self.sd = sd

    def draw(self, n=None):
        return np.random.normal(self.mean, self.sd, n)

class Group:
    def __init__(self, population, n):
        self.population = population
        self.data = population.draw(n)

    @property
    def mean(self):
        return round(np.mean(self.data), NDECIMALS)

    @property
    def sd(self):
        return round(np.std(self.data), NDECIMALS)
    
    @property
    def n(self):
        return len(self.data)


class Comparison:
    def __init__(self, paired, group1, group2, tscore, pvalue, ncomparisons=1):
        self.paired = paired
        self.group1 = group1
        self.group2 = group2
        self._tscore = tscore
        self._pvalue = pvalue
        self.ncomparisons = ncomparisons
    

class PairedDataSimulation:
    def __init__(self, n, nlevels, paired = False):
        self.nlevels = nlevels
        self.n = n
        self.paired = paired

    def generate_comparisons(self, groups):
        return groups
        
    def generate(self):
        groups = []

        for i in range(0, self.nlevels):
            same_mean = random.random() < 0.5 # Half of the populations have the same mean
            mean = 0 if same_mean else np.random.normal(0, 1)
            sd = 2
            population = NormalPopulation(mean, sd)
            groups.append(Group(population, self.n))

        # If the data is paired, we add a random intercept to each participant
        if self.paired:
            for participantid in range(0, self.n):
                intercept = np.random.normal(0, random.choice([0.1, 0.5, 0.9]))
                for i in range(0, self.nlevels): 
                    groups[i].data[participantid] += intercept

        
        return self.generate_comparisons(groups)


# Supposed to match R's calculation
# https://stackoverflow.com/a/33374673
def ci(a, conf=0.95):
  mean, sem, m = np.mean(a), st.sem(a), st.t.ppf((1+conf)/2., len(a)-1)
  a = mean - m*sem
  b = mean + m*sem
  return min(a, b), max(a, b)

test_cases = []

for i in range(0, 20):
    simulation = PairedDataSimulation(random.choice([8, 12, 24]), 2, paired=random.choice([True, False]))
    [group1, group2] = simulation.generate()


    ttest = pg.ttest(group2.data, group1.data, simulation.paired, correction=False)
    ttest90 = pg.ttest(group2.data, group1.data, simulation.paired, correction=False, confidence=0.90)

    group1_ci = ci(group1.data)
    group1_ci90 = ci(group1.data, conf=0.90)
    group2_ci = ci(group2.data)
    group2_ci90 = ci(group2.data, conf=0.90)

    sd = math.sqrt((np.std(group1.data, ddof=1)**2 + np.std(group2.data, ddof=1)**2)/2) if not simulation.paired else np.std(group1.data - group2.data, ddof=1)
    se = abs((group1.mean - group2.mean)/ttest['T'].values[0])

    res = {
        # About group1
        'n1': group1.n,
        'SD1': np.std(group1.data, ddof=1),
        'SE1': np.std(group1.data, ddof=1)/math.sqrt(group1.n),
        'mean1': group1.mean,
        'CI 95% lower1': group1_ci[0],
        'CI 95% upper1': group1_ci[1],
        'MoE 95%1': (group1_ci[1]-group1_ci[0])/2,
        'CI 90% lower1': group1_ci90[0],
        'CI 90% upper1': group1_ci90[1],
        'MoE 90%1': (group1_ci90[1]-group1_ci90[0])/2,

        # About group2
        'n2': group2.n,
        'SD2': np.std(group2.data, ddof=1),
        'SE2': np.std(group2.data, ddof=1)/math.sqrt(group2.n),
        'mean2': group2.mean,
        'CI 95% lower2': group2_ci[0],
        'CI 95% upper2': group2_ci[1],
        'MoE 95%2': (group2_ci[1]-group2_ci[0])/2,
        'CI 90% lower2': group2_ci90[0],
        'CI 90% upper2': group2_ci90[1],
        'MoE 90%2': (group2_ci90[1]-group2_ci90[0])/2,

        't-score': ttest['T'].values[0],
        'p-value': ttest['p-val'].values[0],
        'degrees of freedom': ttest['dof'].values[0],
        'Cohen d': ttest['cohen-d'].values[0],
        'paired': 1 if simulation.paired else 0,
        'CI 95% lower': ttest['CI95%'].values[0][0],
        'CI 95% upper': ttest['CI95%'].values[0][1],
        'MoE 95%': (ttest['CI95%'].values[0][1]-ttest['CI95%'].values[0][0])/2,
        'CI 90% lower': ttest90['CI90%'].values[0][0],
        'CI 90% upper': ttest90['CI90%'].values[0][1],
        'MoE 90%': (ttest90['CI90%'].values[0][1]-ttest90['CI90%'].values[0][0])/2,
        'SD': sd,
        'SE': se
    }

    test_cases.append(res)


print(test_cases)


