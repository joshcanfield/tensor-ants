export default class IdSource {
    private static idSource: { [key: string]: number } = {};

    public static nextId(name: string): number {
        let id = IdSource.idSource[name];
        if (id === undefined) {
            return IdSource.idSource[name] = 0;
        }
        return ++IdSource.idSource[name];
    }
}
