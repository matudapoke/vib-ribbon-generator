
export class Processor {
  constructor() {
    this.cv = window.cv;
  }

  isReady() {
    return !!this.cv;
  }

  async processImage(imageSource, options = {}) {
    if (!this.cv) return null;
    const { threshold1 = 100, threshold2 = 200, epsilonFactor = 0.002 } = options;

    let src;
    try {
      if (imageSource.tagName === 'VIDEO') {
        const canvas = document.createElement('canvas');
        canvas.width = imageSource.videoWidth;
        canvas.height = imageSource.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(imageSource, 0, 0, canvas.width, canvas.height);
        src = this.cv.imread(canvas);
      } else {
        src = this.cv.imread(imageSource);
      }
    } catch (e) {
      console.error("Failed to read image source", e);
      return null;
    }
    const gray = new this.cv.Mat();
    this.cv.cvtColor(src, gray, this.cv.COLOR_RGBA2GRAY, 0);

    // Blur to reduce noise
    const blurred = new this.cv.Mat();
    const ksize = new this.cv.Size(5, 5);
    this.cv.GaussianBlur(gray, blurred, ksize, 0, 0, this.cv.BORDER_DEFAULT);

    // Canny Edge Detection
    const edges = new this.cv.Mat();
    this.cv.Canny(blurred, edges, threshold1, threshold2, 3, false);

    // Find Contours
    const contours = new this.cv.MatVector();
    const hierarchy = new this.cv.Mat();
    this.cv.findContours(edges, contours, hierarchy, this.cv.RETR_EXTERNAL, this.cv.CHAIN_APPROX_SIMPLE);

    const polylines = [];
    for (let i = 0; i < contours.size(); ++i) {
      const contour = contours.get(i);
      const approx = new this.cv.Mat();
      const epsilon = epsilonFactor * this.cv.arcLength(contour, true);
      this.cv.approxPolyDP(contour, approx, epsilon, true);

      const points = [];
      for (let j = 0; j < approx.rows; ++j) {
        points.push({
          x: approx.data32S[j * 2],
          y: approx.data32S[j * 2 + 1]
        });
      }
      polylines.push(points);
      approx.delete();
    }

    // Cleanup
    src.delete();
    gray.delete();
    blurred.delete();
    edges.delete();
    contours.delete();
    hierarchy.delete();

    return polylines;
  }
}

export const processor = new Processor();
