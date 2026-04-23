export class MaxHeap {
  constructor() {
    this.heap = [];
    this.idToIndex = new Map();
  }

  parent(i) { return Math.floor((i - 1) / 2); }
  leftChild(i) { return 2 * i + 1; }
  rightChild(i) { return 2 * i + 2; }

  swap(i, j) {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
    this.idToIndex.set(this.heap[i].id, i);
    this.idToIndex.set(this.heap[j].id, j);
  }

  insert(node) {
    if (this.idToIndex.has(node.id)) {
      return this.updateKey(node.id, node.score, node);
    }
    
    this.heap.push(node);
    const index = this.heap.length - 1;
    this.idToIndex.set(node.id, index);
    this.siftUp(index);
  }

  siftUp(i) {
    while (i > 0 && this.heap[this.parent(i)].score < this.heap[i].score) {
      this.swap(this.parent(i), i);
      i = this.parent(i);
    }
  }

  siftDown(i) {
    let maxIndex = i;
    const l = this.leftChild(i);
    const r = this.rightChild(i);
    const size = this.heap.length;

    if (l < size && this.heap[l].score > this.heap[maxIndex].score) {
      maxIndex = l;
    }
    if (r < size && this.heap[r].score > this.heap[maxIndex].score) {
      maxIndex = r;
    }

    if (i !== maxIndex) {
      this.swap(i, maxIndex);
      this.siftDown(maxIndex);
    }
  }

  extractMax() {
    if (this.heap.length === 0) return null;
    const max = this.heap[0];
    const last = this.heap.pop();
    this.idToIndex.delete(max.id);
    
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.idToIndex.set(last.id, 0);
      this.siftDown(0);
    }
    return max;
  }

  updateKey(id, newScore, updatedData = null) {
    if (!this.idToIndex.has(id)) return;
    const index = this.idToIndex.get(id);
    const oldScore = this.heap[index].score;
    this.heap[index].score = newScore;
    
    if (updatedData) {
      this.heap[index] = { ...this.heap[index], ...updatedData, score: newScore };
    }

    if (newScore > oldScore) {
      this.siftUp(index);
    } else if (newScore < oldScore) {
      this.siftDown(index);
    }
  }

  getTopN(n) {
    const tempHeap = new MaxHeap();
    this.heap.forEach(node => tempHeap.insert({...node}));
    const result = [];
    for (let i = 0; i < n && tempHeap.heap.length > 0; i++) {
      result.push(tempHeap.extractMax());
    }
    return result;
  }

  remove(id) {
    if (!this.idToIndex.has(id)) return false;
    const index = this.idToIndex.get(id);
    const lastIndex = this.heap.length - 1;

    if (index === lastIndex) {
      this.idToIndex.delete(id);
      this.heap.pop();
      return true;
    }

    this.swap(index, lastIndex);
    this.idToIndex.delete(id);
    this.heap.pop();
    // restore heap property
    this.siftDown(index);
    this.siftUp(index);
    return true;
  }

  getAll() {
     return this.getTopN(this.heap.length);
  }
}
