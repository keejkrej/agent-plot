# agent-plot examples

This folder contains synthetic data you can point the assistant at.

## Files

- `sample-image.tif` — synthetic 16-bit grayscale image (512×512) with a Gaussian blob, gradient, and noise.
- `experiment.csv` — synthetic experimental measurements for three conditions.

## Example prompts

1. **Inspect the TIFF image**
   > Analyze /Users/jack/workspace/agent-plot/data/examples/sample-image.tif and build a canvas preview.

2. **Summarize the CSV**
   > Read /Users/jack/workspace/agent-plot/data/examples/experiment.csv and show me a table of mean intensity and area per condition.

3. **Plot the CSV**
   > Plot intensity by condition for /Users/jack/workspace/agent-plot/data/examples/experiment.csv and save the result as a bar chart in the canvas.

4. **Combined analysis**
   > I am comparing a control sample with two treatments. Analyze the experiment.csv file, run a t-test against control, and display the results.
