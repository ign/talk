import React, { Component } from "react";

import { withContext } from "talk-framework/lib/bootstrap";
import { BadUserInputError } from "talk-framework/lib/errors";
import { PromisifiedStorage } from "talk-framework/lib/storage";
import { PropTypesOf } from "talk-framework/types";

import {
  CreateCommentMutation,
  withCreateCommentMutation,
} from "talk-stream/mutations";
import PostCommentForm, {
  PostCommentFormProps,
} from "../components/PostCommentForm";
import getSubmitStatus, { SubmitStatus } from "../helpers/getSubmitStatus";

interface InnerProps {
  createComment: CreateCommentMutation;
  storyID: string;
  sessionStorage: PromisifiedStorage;
}

interface State {
  initialValues?: PostCommentFormProps["initialValues"];
  initialized: boolean;
  submitStatus: SubmitStatus | null;
}

const contextKey = "postCommentFormBody";

export class PostCommentFormContainer extends Component<InnerProps, State> {
  public state: State = { initialized: false, submitStatus: null };

  constructor(props: InnerProps) {
    super(props);
    this.init();
  }

  private async init() {
    const body = await this.props.sessionStorage.getItem(contextKey);
    if (body) {
      this.setState({
        initialValues: {
          body,
        },
      });
    }
    this.setState({
      initialized: true,
    });
  }

  private handleOnSubmit: PostCommentFormProps["onSubmit"] = async (
    input,
    form
  ) => {
    if (this.state.submitStatus) {
      this.setState({ submitStatus: null });
    }
    try {
      const submitStatus = getSubmitStatus(
        await this.props.createComment({
          storyID: this.props.storyID,
          ...input,
        })
      );
      if (submitStatus !== "RETRY") {
        form.reset({});
      }
      this.setState({ submitStatus });
    } catch (error) {
      if (error instanceof BadUserInputError) {
        return error.invalidArgsLocalized;
      }
      // tslint:disable-next-line:no-console
      console.error(error);
    }
    return;
  };

  private handleOnChange: PostCommentFormProps["onChange"] = state => {
    if (state.values.body) {
      this.props.sessionStorage.setItem(contextKey, state.values.body);
    } else {
      this.props.sessionStorage.removeItem(contextKey);
    }
  };

  public render() {
    if (!this.state.initialized) {
      return null;
    }
    return (
      <PostCommentForm
        onSubmit={this.handleOnSubmit}
        onChange={this.handleOnChange}
        initialValues={this.state.initialValues}
        submitStatus={this.state.submitStatus}
      />
    );
  }
}

const enhanced = withContext(({ sessionStorage }) => ({
  sessionStorage,
}))(withCreateCommentMutation(PostCommentFormContainer));
export type PostCommentFormContainerProps = PropTypesOf<typeof enhanced>;
export default enhanced;
