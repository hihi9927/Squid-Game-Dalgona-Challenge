export class Queue {
    constructor(capacity = 1024) {
        this.buffer = new Array(capacity);
        this.head = 0;
        this.tail = 0;
        this.size = 0;
        this.capacity = capacity;
    }

    push(value) {
        if (this.size === this.capacity) this._resize();
        this.buffer[this.tail] = value;
        this.tail = (this.tail + 1) % this.capacity;
        this.size++;
    }
    pop() {
        if (this.size === 0) return null;
        const value = this.buffer[this.head];
        this.buffer[this.head] = undefined;
        this.head = (this.head + 1) % this.capacity;
        this.size--;
        return value;
    }

    _resize() {        
        const newBuffer = new Array(this.capacity);
        for (let i = 0; i < this.size; i++)
            newBuffer[i] = this.buffer[(this.head + i) % this.capacity];
        this.head = 0;
        this.tail = this.size;
        this.capacity *= 2;
        this.buffer = newBuffer;
    }
}