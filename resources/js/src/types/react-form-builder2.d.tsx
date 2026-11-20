declare module 'react-form-builder2' {  
    import { Component } from 'react';
    export interface FormBuilderProps {
      data: any[];
      onChange: (data: any[]) => void;
      onSubmit?: (data: any[]) => void;
      saveUrl?: string;
      answer_data?: any[];
      form_action?: string;
      form_method?: string;
      submitButton?:{};
      toolbarItems?:any[];
      edit?:true;
    }
  
    export class ReactFormBuilder extends Component<FormBuilderProps> {}
    export class ReactFormGenerator extends Component<FormBuilderProps>{}
    export class ElementStore{}
    export class Registry{}
  }