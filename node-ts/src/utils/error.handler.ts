"use strict";

import * as express from "express";

export const ERROR_UNATORIZED = 401;
export const ERROR_NOT_FOUND = 404;
export const ERROR_UNAUTORIZED_METHOD = 405;
export const ERROR_BAD_REQUEST = 400;
export const ERROR_INTERNAL_ERROR = 500;

export interface ValidationErrorItem {
  path: string;
  message: string;
}
export interface ValidationErrorMessage {
  error?: string;
  message?: ValidationErrorItem[];
}

// Error desconocido
function processUnknownError(res: express.Response, err: any): ValidationErrorMessage {
  res.status(ERROR_INTERNAL_ERROR);
  res.header("X-Status-Reason: Unknown error");
  return { error: err };
}

// Obtiene un error adecuando cuando hay errores de db
function processMongooseErrorCode(res: express.Response, err: any): ValidationErrorMessage {
  res.status(ERROR_BAD_REQUEST);

  try {
    switch (err.code) {
      case 11000:
      case 11001:
        res.header("X-Status-Reason: Unique constraint");

        const fieldName = err.err.substring(
          err.err.lastIndexOf(".$") + 2,
          err.err.lastIndexOf("_1")
        );
        return {
          message: [{
            path: fieldName,
            message: fieldName.charAt(0).toUpperCase() + fieldName.slice(1) + " ya existe"
          }]
        };
      default:
        res.status(ERROR_BAD_REQUEST);
        res.header("X-Status-Reason: Unknown database error code:" + err.code);
        return { error: err };
    }
  } catch (ex) {
    res.status(ERROR_INTERNAL_ERROR);
    res.header("X-Status-Reason: Unknown database error");
    return { error: err };
  }
}

// Error de validacion de datos
function processValidationError(res: express.Response, err: any): ValidationErrorMessage {
  res.header("X-Status-Reason: Validation failed");
  res.status(ERROR_BAD_REQUEST);
  return {
    message: <ValidationErrorItem[]>err.errors
  };
}

export function handleError(res: express.Response, err: any): express.Response {
  if (err.code) {   // Database Error
    return res.send(processMongooseErrorCode(res, err));
  } else if (err.errors) {  // ValidationError
    return res.send(processValidationError(res, err));
  } else {
    return res.send(processUnknownError(res, err));
  }
}
