export class Parameter {
    constructor(
        name: string,
        value: string,
        language?: string,
        charset?: string
    ) {
        this._name = name;
        this._lowerCaseName = name.toLowerCase();
        this.value = value;
        this.language = language;
        this.charset = charset;
    }

    private _name: string;
    private _lowerCaseName: string;

    /**
     * Note that if the name ends in * its considered 'extended'
     */
    get name() {
        return this._name;
    }
    set name(name: string) {
        this._name = name;
        this._lowerCaseName = name.toLowerCase();
    }
    get lowerCaseName() {
        return this._lowerCaseName;
    }

    get isExtended() { 
        return Parameter.isExtendedName(this.name);
    }

    public static isExtendedName(name: string) {
        const lastLetter = name[name.length - 1];
        return lastLetter == "*";
    }

    value: string;

    /**
     * For extended parameters
     */
    language?: string;

    /**
     * For extended parameters.
     * Ignored on write as only utf-8 is supported.
     */
    charset?: string;
}
