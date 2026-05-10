export class LayoutService {
  private size = 0;

  getSize() {
    return this.size;
  }

  setSize(size: number) {
    this.size = size;
  }
}
